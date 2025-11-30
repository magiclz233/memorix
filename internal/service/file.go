package service

import (
	"context"
	"errors"
	"fmt"
	"image"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/magiclz233/memorix/internal/model"
	"github.com/magiclz233/memorix/internal/repository"
	"github.com/rwcarlsen/goexif/exif"
	"github.com/rwcarlsen/goexif/mknote"
	"github.com/rwcarlsen/goexif/tiff"
	"github.com/vansante/go-ffprobe"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// 定义并发扫描的 Worker 数量，可根据服务器 CPU 核心数调整
const (
	ScannerWorkerCount = 10
	BatchInsertSize    = 100 // 每次批量插入数据库的数量
)

type FileService interface {
	GetFile(ctx context.Context, id int64) (*model.File, error)
	ScanAndSavePhotos(ctx context.Context, sourceConfigID uint) error
	GetFileList(c *gin.Context, u uint, param3 uint, page int, pageSize int) (list []model.File, err error)
}

func NewFileService(
	service *Service,
	fileRepository repository.FileRepository,
	sourceConfigRepository repository.SourceConfigRepository,
) FileService {
	return &fileService{
		Service:                service,
		fileRepository:         fileRepository,
		sourceConfigRepository: sourceConfigRepository,
	}
}

type fileService struct {
	*Service
	fileRepository         repository.FileRepository
	sourceConfigRepository repository.SourceConfigRepository
}

func (s *fileService) GetFile(ctx context.Context, id int64) (*model.File, error) {
	return s.fileRepository.GetFile(ctx, id)
}

// GetFileList 获取文件列表（包含简单的分页逻辑实现）
func (f *fileService) GetFileList(c *gin.Context, u uint, param3 uint, page int, pageSize int) (list []model.File, err error) {
	// 注意：这里需要 Repository 层支持分页查询，这里假设 Repository 有相应的方法
	// 如果 repository 暂未实现，可以使用 GORM 的 Offset 和 Limit 手动实现
	// 示例逻辑：
	return f.fileRepository.ListFiles(c, u, param3, page, pageSize)
}

// ScanAndSavePhotos 扫描并保存照片（并发优化版）
func (s *fileService) ScanAndSavePhotos(ctx context.Context, sourceConfigID uint) error {
	sourceConfig, err := s.sourceConfigRepository.GetSourceConfig(ctx, sourceConfigID)
	if err != nil {
		return fmt.Errorf("获取源配置失败: %w", err)
	}

	if sourceConfig.DefaultPath == "" {
		return fmt.Errorf("源配置 ID %d 未设置默认路径", sourceConfigID)
	}

	s.logger.Info("开始扫描目录", zap.String("path", sourceConfig.DefaultPath))
	startTime := time.Now()

	// 1. 扫描文件路径
	// 使用 Channel 传递文件路径，避免一次性将所有文件对象加载到内存
	pathsChan := make(chan string, 1000)
	filesChan := make(chan *model.File, 1000)

	// 错误收集通道
	errChan := make(chan error, 1)

	// 启动文件路径遍历协程
	go func() {
		defer close(pathsChan)
		err := filepath.Walk(sourceConfig.DefaultPath, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				s.logger.Warn("访问路径出错", zap.String("path", path), zap.Error(err))
				return filepath.SkipDir
			}
			if info.IsDir() {
				// 忽略隐藏目录（例如 .git, .thumbnails）
				if strings.HasPrefix(info.Name(), ".") {
					return filepath.SkipDir
				}
				return nil
			}

			// 简单筛选后缀，避免将非媒体文件发送给 worker
			ext := strings.ToLower(filepath.Ext(path))
			if isImage(ext) || isVideo(ext) {
				pathsChan <- path
			}
			return nil
		})
		if err != nil {
			errChan <- err
		}
	}()

	// 2. 启动 Worker Pool 进行并发元数据提取
	var wg sync.WaitGroup
	for i := 0; i < ScannerWorkerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for path := range pathsChan {
				file, err := s.processFile(path)
				if err != nil {
					s.logger.Debug("处理文件元数据失败", zap.String("path", path), zap.Error(err))
					continue
				}
				if file != nil {
					filesChan <- file
				}
			}
		}()
	}

	// 等待所有 Worker 完成后关闭结果通道
	go func() {
		wg.Wait()
		close(filesChan)
	}()

	// 3. 批量保存到数据库
	// 另外开启一个协程负责聚合结果并批量插入，减少数据库 I/O
	saveDone := make(chan struct{})
	go func() {
		defer close(saveDone)
		var batch []*model.File
		for file := range filesChan {
			batch = append(batch, file)
			if len(batch) >= BatchInsertSize {
				if err := s.saveBatchFiles(ctx, batch); err != nil {
					s.logger.Error("批量保存文件失败", zap.Error(err))
				}
				batch = nil // 清空切片
			}
		}
		// 保存剩余的文件
		if len(batch) > 0 {
			if err := s.saveBatchFiles(ctx, batch); err != nil {
				s.logger.Error("保存剩余文件失败", zap.Error(err))
			}
		}
	}()

	// 等待遍历完成检查是否有遍历错误
	select {
	case err := <-errChan:
		return fmt.Errorf("遍历目录失败: %w", err)
	default:
	}

	// 等待保存完成
	<-saveDone

	s.logger.Info("扫描任务完成",
		zap.String("path", sourceConfig.DefaultPath),
		zap.Duration("duration", time.Since(startTime)),
	)

	return nil
}

// saveBatchFiles 批量插入数据库辅助函数
func (s *fileService) saveBatchFiles(ctx context.Context, files []*model.File) error {
	// 优先通过 Repository 批量写入，避免在 Service 中直接操作数据库
	// 如仓储层暂未提供批量接口，可循环保存或扩展仓储能力
	// 如后续需要事务保护，可在调用处增加事务包装

	if len(files) == 0 {
		return nil
	}

	return s.fileRepository.BatchSaveFiles(ctx, files)
}

// processFile 识别文件类型并提取元数据
func (s *fileService) processFile(path string) (*model.File, error) {
	ext := strings.ToLower(filepath.Ext(path))
	if isImage(ext) {
		return s.extractPhotoMetadata(path)
	}
	if isVideo(ext) {
		return s.extractVideoMetadata(path)
	}
	return nil, nil
}

func isImage(ext string) bool {
	return ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp" || ext == ".heic"
}

func isVideo(ext string) bool {
	return ext == ".mp4" || ext == ".mov" || ext == ".avi" || ext == ".mkv"
}

// extractPhotoMetadata 提取照片 EXIF 信息
func (s *fileService) extractPhotoMetadata(path string) (*model.File, error) {
	fileInfo, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("获取文件信息失败 %s: %w", path, err)
	}

	file := &model.File{
		Title:         fileInfo.Name(),
		Path:          path,
		Size:          fileInfo.Size(),
		SourceType:    "local", // 默认为本地，后续可根据逻辑调整
		Model:         gorm.Model{CreatedAt: fileInfo.ModTime(), UpdatedAt: time.Now()},
		PhotoMetadata: model.PhotoMetadata{},
	}

	// 注册所有厂商的 EXIF 解析器
	exif.RegisterParsers(mknote.All...)

	exifData, err := s.readEXIFData(path)
	if err != nil {
		s.logger.Debug("读取 EXIF 数据出错", zap.String("path", path), zap.Error(err))
	} else if exifData != nil {
		// 拍摄日期
		if timeTag, err := exifData.DateTime(); err == nil {
			file.PhotoMetadata.DateShot = &timeTag
			// 通常以拍摄时间作为文件的创建逻辑时间，方便排序
			file.CreatedAt = timeTag
		}

		// 经纬度
		if lat, long, err := exifData.LatLong(); err == nil {
			file.PhotoMetadata.GPSLatitude = &lat
			file.PhotoMetadata.GPSLongitude = &long
		}

		// 使用辅助函数提取字符串和数值，减少代码重复
		file.PhotoMetadata.Camera = getStringTag(exifData, exif.Model)
		file.PhotoMetadata.Maker = getStringTag(exifData, exif.Make)
		file.PhotoMetadata.Lens = getStringTag(exifData, exif.LensModel)
		file.PhotoMetadata.Exposure = getRatTag(exifData, exif.ExposureTime)
		file.PhotoMetadata.Aperture = getRatTag(exifData, exif.FNumber)
		file.PhotoMetadata.FocalLength = getRatTag(exifData, exif.FocalLength)
		file.PhotoMetadata.Iso = getIntTag(exifData, exif.ISOSpeedRatings)
		file.PhotoMetadata.Flash = getIntTag(exifData, exif.Flash)
		file.PhotoMetadata.Orientation = getIntTag(exifData, exif.Orientation)
		file.PhotoMetadata.ExposureProgram = getIntTag(exifData, exif.ExposureProgram)

		// 白平衡
		if wbTag, err := exifData.Get(exif.WhiteBalance); err == nil {
			if wb, err := wbTag.Int(0); err == nil {
				wbStr := strconv.Itoa(wb)
				file.PhotoMetadata.WhiteBalance = &wbStr
			}
		}
	}

	// 获取图片分辨率
	imgConfig, err := s.getImageConfig(path)
	if err == nil {
		width := imgConfig.Width
		file.PhotoMetadata.ResolutionWidth = &width
		height := imgConfig.Height
		file.PhotoMetadata.ResolutionHeight = &height
	}
	return file, nil
}

// 辅助函数：从 EXIF 获取字符串
func getStringTag(x *exif.Exif, name exif.FieldName) *string {
	if tag, err := x.Get(name); err == nil {
		if val, err := tag.StringVal(); err == nil {
			// 清理可能的空字符或多余空格
			val = strings.TrimSpace(strings.ReplaceAll(val, "\x00", ""))
			if val != "" {
				return &val
			}
		}
	}
	return nil
}

// 辅助函数：从 EXIF 获取分数并转为浮点数 (如光圈、焦距)
func getRatTag(x *exif.Exif, name exif.FieldName) *float64 {
	if tag, err := x.Get(name); err == nil {
		if num, den, err := tag.Rat2(0); err == nil && den != 0 {
			val := float64(num) / float64(den)
			return &val
		}
	}
	return nil
}

// 辅助函数：从 EXIF 获取整数
func getIntTag(x *exif.Exif, name exif.FieldName) *int64 {
	if tag, err := x.Get(name); err == nil {
		if val, err := tag.Int(0); err == nil {
			v := int64(val)
			return &v
		}
	}
	return nil
}

func (s *fileService) readEXIFData(path string) (*exif.Exif, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("打开文件失败 %s: %w", path, err)
	}
	defer f.Close()

	// 限制读取开头的一部分数据即可，避免读取整个大文件，提高性能
	// 通常 EXIF 数据在文件头部
	exifData, err := exif.Decode(f)
	if err != nil {
		// 忽略无 EXIF 数据的错误或 EOF
		if strings.Contains(err.Error(), "no EXIF data") || strings.Contains(err.Error(), "EOF") {
			return nil, nil
		}
		// 处理 goexif 库常见的短标签错误
		if errors.Is(err, tiff.ErrShortReadTagValue) {
			return nil, nil
		}
		return nil, fmt.Errorf("解析 EXIF 失败: %w", err)
	}

	return exifData, nil
}

func (s *fileService) getImageConfig(path string) (image.Config, error) {
	file, err := os.Open(path)
	if err != nil {
		return image.Config{}, fmt.Errorf("打开图片失败: %w", err)
	}
	defer file.Close()

	// 仅解码配置（宽高），不解码整个图片内容，速度快
	imgConfig, _, err := image.DecodeConfig(file)
	if err != nil {
		return image.Config{}, fmt.Errorf("解码图片配置失败: %w", err)
	}
	return imgConfig, nil
}

// extractVideoMetadata 提取视频元数据
func (s *fileService) extractVideoMetadata(path string) (*model.File, error) {
	fileInfo, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("获取文件信息失败: %w", err)
	}

	// 增加超时控制，防止 ffprobe 卡死
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	data, err := ffprobe.GetProbeDataContext(ctx, path)
	if err != nil {
		return nil, fmt.Errorf("ffprobe 探测失败: %w", err)
	}

	var width, height int
	var duration float64
	var codec, bitrate, colorProfile, audio *string
	var framerate *float64

	// 查找视频流
	stream := data.GetFirstVideoStream()
	if stream != nil {
		width = stream.Width
		height = stream.Height
		duration, _ = strconv.ParseFloat(stream.Duration, 64)

		if stream.CodecName != "" {
			c := stream.CodecName
			codec = &c
		}
		if stream.BitRate != "" {
			b := stream.BitRate
			bitrate = &b
		}
		// 提取帧率逻辑
		if stream.AvgFrameRate != "" {
			parts := strings.Split(stream.AvgFrameRate, "/")
			if len(parts) == 2 {
				num, _ := strconv.ParseFloat(parts[0], 64)
				den, _ := strconv.ParseFloat(parts[1], 64)
				if den != 0 {
					f := num / den
					framerate = &f
				}
			}
		}
	}

	// 查找音频流
	audioStream := data.GetFirstAudioStream()
	if audioStream != nil && audioStream.CodecName != "" {
		a := audioStream.CodecName
		audio = &a
	}

	videoMeta := model.VideoMetadata{
		ResolutionWidth:  width,
		ResolutionHeight: height,
		Duration:         duration,
		Codec:            codec,
		Framerate:        framerate,
		Bitrate:          bitrate,
		ColorProfile:     colorProfile,
		Audio:            audio,
	}

	file := &model.File{
		Title:         fileInfo.Name(),
		Path:          path,
		Size:          fileInfo.Size(),
		SourceType:    "local",
		Model:         gorm.Model{CreatedAt: fileInfo.ModTime(), UpdatedAt: time.Now()},
		VideoMetadata: videoMeta,
	}
	return file, nil
}
