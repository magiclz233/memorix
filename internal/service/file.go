package service

import (
	"context"
	"fmt"
	"image"
	"os"
	"path/filepath" // Import filepath
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/magiclz233/memorix/internal/model"
	"github.com/magiclz233/memorix/internal/repository"
	"github.com/rwcarlsen/goexif/exif"
	"github.com/rwcarlsen/goexif/mknote"
	"go.uber.org/zap"
	"gorm.io/gorm"
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

func (f *fileService) GetFileList(c *gin.Context, u uint, param3 uint, page int, pageSize int) (list []model.File, err error) {
	panic("unimplemented")
}

func (s *fileService) ScanAndSavePhotos(ctx context.Context, sourceConfigID uint) error {
	sourceConfig, err := s.sourceConfigRepository.GetSourceConfig(ctx, sourceConfigID)
	if err != nil {
		return fmt.Errorf("error retrieving source config: %w", err)
	}

	if sourceConfig.DefaultPath == "" {
		return fmt.Errorf("default path not set for source config %d", sourceConfigID)
	}

	files, err := s.ScanPhotos(ctx, sourceConfig.DefaultPath)
	if err != nil {
		return fmt.Errorf("error scanning photos: %w", err)
	}

	for _, file := range files {
		if err := s.fileRepository.SaveFile(ctx, file); err != nil {
			s.logger.Error("Error saving file metadata",
				zap.String("filename", file.Title),
				zap.Error(err),
			)
		}
	}

	return nil
}

func (s *fileService) ScanPhotos(ctx context.Context, dirPath string) ([]*model.File, error) {
	var files []*model.File
	var scanErrors []string // Collect non-fatal errors

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			// Log and potentially skip this entry if path is inaccessible
			s.logger.Debug("Error accessing path",
				zap.String("path", path),
				zap.Error(err),
			)
			return filepath.SkipDir // Skip this directory or file if error occurs during walk setup
		}

		if info.IsDir() {
			return nil // Skip directories
		}

		// 判断文件类型
		ext := strings.ToLower(filepath.Ext(path))
		if ext == ".jpg" || ext == ".jpeg" || ext == ".png" {
			file, extractErr := s.extractPhotoMetadata(path)
			if extractErr != nil {
				s.logger.Warn("Error extracting metadata",
					zap.String("path", path),
					zap.Error(extractErr),
				)
				scanErrors = append(scanErrors, fmt.Sprintf("Error extracting metadata from %s: %v", path, extractErr))
				return nil
			}
			files = append(files, file)
			return nil
		}
		if ext == ".mp4" || ext == ".mov" || ext == ".avi" || ext == ".mkv" {
			file, extractErr := s.extractVideoMetadata(path)
			if extractErr != nil {
				s.logger.Warn("Error extracting video metadata",
					zap.String("path", path),
					zap.Error(extractErr),
				)
				scanErrors = append(scanErrors, fmt.Sprintf("Error extracting video metadata from %s: %v", path, extractErr))
				return nil
			}
			files = append(files, file)
			return nil
		}
		return nil
	})

	if err != nil {
		// This error is from filepath.Walk itself (e.g., permission issues on the root dir)
		return nil, fmt.Errorf("error scanning directory %s: %w", dirPath, err)
	}

	// Optionally, return collected non-fatal errors if needed
	if len(scanErrors) > 0 {
		// You might want to return a custom error type containing these details
		s.logger.Warn("Completed scan with non-fatal errors",
			zap.String("dirPath", dirPath),
			zap.Int("errorCount", len(scanErrors)),
		)
	}

	return files, nil
}

func (s *fileService) extractPhotoMetadata(path string) (*model.File, error) {
	fileInfo, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("error getting file info for %s: %w", path, err)
	}

	file := &model.File{
		Title:         fileInfo.Name(),
		Path:          path,
		Size:          fileInfo.Size(),
		Model:         gorm.Model{CreatedAt: fileInfo.ModTime(), UpdatedAt: time.Now()},
		PhotoMetadata: model.PhotoMetadata{},
	}

	exif.RegisterParsers(mknote.All...)

	exifData, err := s.readEXIFData(path)
	if err != nil {
		s.logger.Debug("Error reading EXIF data",
			zap.String("path", path),
			zap.Error(err),
		)
	} else if exifData != nil {
		// 拍摄日期
		if timeTag, err := exifData.DateTime(); err == nil {
			file.PhotoMetadata.DateShot = &timeTag
			file.CreatedAt = timeTag
		}
		// 经纬度
		if lat, long, err := exifData.LatLong(); err == nil {
			file.PhotoMetadata.GPSLatitude = &lat
			file.PhotoMetadata.GPSLongitude = &long
		}
		// 相机型号
		if modelTag, err := exifData.Get(exif.Model); err == nil {
			if device, err := modelTag.StringVal(); err == nil {
				file.PhotoMetadata.Camera = &device
			}
		}
		// 制造商
		if makerTag, err := exifData.Get(exif.Make); err == nil {
			if maker, err := makerTag.StringVal(); err == nil {
				file.PhotoMetadata.Maker = &maker
			}
		}
		// 镜头型号
		if lensTag, err := exifData.Get(exif.LensModel); err == nil {
			if lens, err := lensTag.StringVal(); err == nil {
				file.PhotoMetadata.Lens = &lens
			}
		}
		// 曝光时间
		if exposureTag, err := exifData.Get(exif.ExposureTime); err == nil {
			if num, den, err := exposureTag.Rat2(0); err == nil && den != 0 {
				exposure := float64(num) / float64(den)
				file.PhotoMetadata.Exposure = &exposure
			}
		}
		// 光圈值
		if apertureTag, err := exifData.Get(exif.FNumber); err == nil {
			if num, den, err := apertureTag.Rat2(0); err == nil && den != 0 {
				aperture := float64(num) / float64(den)
				file.PhotoMetadata.Aperture = &aperture
			}
		}
		// ISO
		if isoTag, err := exifData.Get(exif.ISOSpeedRatings); err == nil {
			if iso, err := isoTag.Int(0); err == nil {
				isoValue := int64(iso)
				file.PhotoMetadata.Iso = &isoValue
			}
		}
		// 焦距
		if focalTag, err := exifData.Get(exif.FocalLength); err == nil {
			if num, den, err := focalTag.Rat2(0); err == nil && den != 0 {
				focalLength := float64(num) / float64(den)
				file.PhotoMetadata.FocalLength = &focalLength
			}
		}
		// 闪光灯
		if flashTag, err := exifData.Get(exif.Flash); err == nil {
			if flash, err := flashTag.Int(0); err == nil {
				flashValue := int64(flash)
				file.PhotoMetadata.Flash = &flashValue
			}
		}
		// 方向
		if orientationTag, err := exifData.Get(exif.Orientation); err == nil {
			if orientation, err := orientationTag.Int(0); err == nil {
				orientationValue := int64(orientation)
				file.PhotoMetadata.Orientation = &orientationValue
			}
		}
		// 曝光程序
		if expProgramTag, err := exifData.Get(exif.ExposureProgram); err == nil {
			if expProgram, err := expProgramTag.Int(0); err == nil {
				expProgramValue := int64(expProgram)
				file.PhotoMetadata.ExposureProgram = &expProgramValue
			}
		}
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

func (s *fileService) readEXIFData(path string) (*exif.Exif, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("error opening file %s: %w", path, err)
	}
	defer f.Close()

	exifData, err := exif.Decode(f)
	if err != nil {
		// Check for specific non-critical errors like 'no exif data'
		if strings.Contains(err.Error(), "no EXIF data") || strings.Contains(err.Error(), "EOF") {
			s.logger.Debug("No EXIF data found",
				zap.String("path", path),
			)
			return nil, nil // Not a fatal error, just no data
		}
		return nil, fmt.Errorf("error decoding EXIF data from %s: %w", path, err)
	}

	return exifData, nil
}

func (s *fileService) getImageConfig(path string) (image.Config, error) {
	file, err := os.Open(path)
	if err != nil {
		return image.Config{}, fmt.Errorf("failed to open image file %s: %w", path, err)
	}
	defer file.Close()

	imgConfig, _, err := image.DecodeConfig(file)
	if err != nil {
		return image.Config{}, fmt.Errorf("failed to decode image config for %s: %w", path, err)
	}
	return imgConfig, nil
}

// 提取视频元数据
func (s *fileService) extractVideoMetadata(path string) (*model.File, error) {
	fileInfo, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("error getting file info for %s: %w", path, err)
	}
	// 使用ffprobe获取视频信息
	probeData, err := ffprobe.GetProbeData(path, 5*time.Second)
	if err != nil {
		return nil, fmt.Errorf("ffprobe error for %s: %w", path, err)
	}
	var width, height int
	var duration float64
	var codec, bitrate, colorProfile, audio *string
	var framerate *float64
	for _, stream := range probeData.Streams {
		if stream.CodecType == "video" {
			width = stream.Width
			height = stream.Height
			duration, _ = stream.Duration()
			if stream.CodecName != "" {
				codec = &stream.CodecName
			}
			if stream.BitRate != "" {
				bitrate = &stream.BitRate
			}
			if stream.ColorSpace != "" {
				colorProfile = &stream.ColorSpace
			}
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
		if stream.CodecType == "audio" && stream.CodecName != "" {
			audio = &stream.CodecName
		}
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
		Title:     fileInfo.Name(),
		Path:      path,
		Size:      fileInfo.Size(),
		Model:     gorm.Model{CreatedAt: fileInfo.ModTime(), UpdatedAt: time.Now()},
		VideoMetadata: videoMeta,
	}
	return file, nil
}
