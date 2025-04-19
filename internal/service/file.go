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
				zap.String("filename", file.Filename),
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

		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
			return nil // Skip non-image files
		}

		file, extractErr := s.extractPhotoMetadata(path)
		if extractErr != nil {
			// Log the error and add to scanErrors, but continue scanning other files
			s.logger.Warn("Error extracting metadata",
				zap.String("path", path),
				zap.Error(extractErr),
			)
			scanErrors = append(scanErrors, fmt.Sprintf("Error extracting metadata from %s: %v", path, extractErr))
			return nil // Continue to next file despite error
		}

		files = append(files, file)
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
		Filename:  fileInfo.Name(),
		Path:      path,
		Size:      fileInfo.Size(),
		CreatedAt: fileInfo.ModTime(),
		UpdatedAt: time.Now(),
		PhotoMetadata:  model.PhotoMetadata{},
	}

	exif.RegisterParsers(mknote.All...)

	exifData, err := s.readEXIFData(path)
	if err != nil {
		s.logger.Debug("Error reading EXIF data",
			zap.String("path", path),
			zap.Error(err),
		)
	} else if exifData != nil {
		// 捕获时间
		if timeTag, err := exifData.DateTime(); err == nil {
			file.PhotoMetadata.CaptureTime = timeTag
			file.CreatedAt = timeTag
		} else {
			s.logger.Debug("Could not read DateTime tag",
				zap.String("path", path),
				zap.Error(err),
			)
		}

		// 经纬度
		if lat, long, err := exifData.LatLong(); err == nil {
			file.PhotoMetadata.Location = fmt.Sprintf("%f,%f", lat, long)
		} else {
			s.logger.Debug("Could not read LatLong tag",
				zap.String("path", path),
				zap.Error(err),
			)
		}

		// 设备型号
		if modelTag, err := exifData.Get(exif.Model); err == nil {
			if device, err := modelTag.StringVal(); err == nil {
				file.PhotoMetadata.Device = device
			}
		} else {
			s.logger.Debug("Could not read Model tag",
				zap.String("path", path),
				zap.Error(err),
			)
		}

		// 焦距
		if focalTag, err := exifData.Get(exif.FocalLength); err == nil {
			if num, den, err := focalTag.Rat2(0); err == nil && den != 0 {
				file.PhotoMetadata.FocalLength = float64(num) / float64(den)
			} else {
				s.logger.Debug("Could not convert FocalLength tag to float",
					zap.String("path", path),
					zap.Error(err),
				)
			}
		} else {
			s.logger.Debug("Could not read FocalLength tag",
				zap.String("path", path),
				zap.Error(err),
			)
		}

		// 光圈
		if apertureTag, err := exifData.Get(exif.FNumber); err == nil {
			if num, den, err := apertureTag.Rat2(0); err == nil && den != 0 {
				file.PhotoMetadata.Aperture = float64(num) / float64(den)
			} else {
				s.logger.Debug("Could not convert FNumber tag to float",
					zap.String("path", path),
					zap.Error(err),
				)
			}
		} else {
			s.logger.Debug("Could not read FNumber tag",
				zap.String("path", path),
				zap.Error(err),
			)
		}

		// ISO
		if isoTag, err := exifData.Get(exif.ISOSpeedRatings); err == nil {
			if iso, err := isoTag.Int(0); err == nil {
				file.PhotoMetadata.ISO = float64(iso)
			} else {
				s.logger.Debug("Could not convert ISOSpeedRatings tag to int",
					zap.String("path", path),
					zap.Error(err),
				)
			}
		} else {
			s.logger.Debug("Could not read ISOSpeedRatings tag",
				zap.String("path", path),
				zap.Error(err),
			)
		}

		// 白平衡
		if wbTag, err := exifData.Get(exif.WhiteBalance); err == nil {
			if wb, err := wbTag.Int(0); err == nil {
				file.PhotoMetadata.WhiteBalance = strconv.Itoa(wb)
			} else {
				s.logger.Debug("Could not convert WhiteBalance tag to int",
					zap.String("path", path),
					zap.Error(err),
				)
			}
		} else {
			s.logger.Debug("Could not read WhiteBalance tag",
				zap.String("path", path),
				zap.Error(err),
			)
		}

		// 曝光补偿
		if expBiasTag, err := exifData.Get(exif.ExposureBiasValue); err == nil {
			if num, den, err := expBiasTag.Rat2(0); err == nil && den != 0 {
				file.PhotoMetadata.Exposure = float64(num) / float64(den)
			} else {
				s.logger.Debug("Could not convert ExposureBiasValue tag to float",
					zap.String("path", path),
					zap.Error(err),
				)
			}
		} else {
			s.logger.Debug("Could not read ExposureBiasValue tag",
				zap.String("path", path),
				zap.Error(err),
			)
		}

		// 闪光灯
		if flashTag, err := exifData.Get(exif.Flash); err == nil {
			if flash, err := flashTag.Int(0); err == nil {
				file.PhotoMetadata.Flash = flash != 0
			} else {
				s.logger.Debug("Could not convert Flash tag to int",
					zap.String("path", path),
					zap.Error(err),
				)
			}
		} else {
			s.logger.Debug("Could not read Flash tag",
				zap.String("path", path),
				zap.Error(err),
			)
		}
	}

	// 获取图片分辨率
	imgConfig, err := s.getImageConfig(path)
	if err == nil {
		file.PhotoMetadata.ResolutionWidth = imgConfig.Width
		file.PhotoMetadata.ResolutionHeight = imgConfig.Height
	} else {
		s.logger.Warn("Error getting image dimensions",
			zap.String("path", path),
			zap.Error(err),
		)
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
