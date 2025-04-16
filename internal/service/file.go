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

	"github.com/magiclz233/memorix/internal/model"
	"github.com/magiclz233/memorix/internal/repository"
	"github.com/rwcarlsen/goexif/exif"   // Import exif
	"github.com/rwcarlsen/goexif/mknote" // Import mknote for exif
)

type FileService interface {
	GetFile(ctx context.Context, id int64) (*model.File, error)
	ScanAndSavePhotos(ctx context.Context, sourceConfigID int64) error
}

func NewFileService(
	service *Service,
	fileRepository repository.FileRepository,
) FileService {
	return &fileService{
		Service:        service,
		fileRepository: fileRepository,
	}
}

type fileService struct {
	*Service
	fileRepository repository.FileRepository
}

func (s *fileService) GetFile(ctx context.Context, id int64) (*model.File, error) {
	return s.fileRepository.GetFile(ctx, id)
}

func (s *fileService) ScanAndSavePhotos(ctx context.Context, sourceConfigID int64) error {
	sourceConfig, err := s.SourceConfigService.GetSourceConfig(ctx, sourceConfigID)
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
			s.logger.Error(fmt.Sprintf("Error saving file metadata for %s: %v", file.Filename, err))
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
			s.logger.WithContext("Error accessing path %s: %v", path, err)
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
			errorMsg := fmt.Sprintf("Error extracting metadata from %s: %v", path, extractErr)
			s.Logger.Warn(errorMsg)
			scanErrors = append(scanErrors, errorMsg)
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
		s.Logger.Warnf("Completed scan of %s with %d non-fatal errors", dirPath, len(scanErrors))
	}

	return files, nil
}

func (s *fileService) extractPhotoMetadata(path string) (*model.File, error) {
	fileInfo, err := os.Stat(path)
	if err != nil {
		// Return error immediately if file info cannot be obtained
		return nil, fmt.Errorf("error getting file info for %s: %w", path, err)
	}

	file := &model.File{
		Filename:  fileInfo.Name(),
		Path:      path,
		Size:      fileInfo.Size(),
		CreatedAt: fileInfo.ModTime(), // Use file modification time as a fallback/default
		UpdatedAt: time.Now(),
		Metadata:  &model.PhotoMetadata{},
	}

	// Initialize exif library (needed for some camera models)
	exif.RegisterParsers(mknote.All...) // Add this line

	exifData, err := s.readEXIFData(path)
	if err != nil {
		s.Logger.Warnf("Error reading EXIF data from %s: %v", path, err)
		// Continue without EXIF data, but log the warning
	} else {
		// Process EXIF data only if successfully read
		if timeTag, err := exifData.DateTime(); err == nil {
			file.Metadata.CaptureTime = timeTag
			file.CreatedAt = timeTag // Prefer capture time for CreatedAt if available
		} else {
			s.Logger.Debugf("Could not read DateTime tag from %s: %v", path, err)
		}

		if lat, long, err := exifData.LatLong(); err == nil {
			file.Metadata.Location = fmt.Sprintf("%f,%f", lat, long)
		} else {
			s.Logger.Debugf("Could not read LatLong tag from %s: %v", path, err)
		}

		if modelTag, err := exifData.Get(exif.Model); err == nil {
			file.Metadata.Device, _ = modelTag.StringVal()
		} else {
			s.Logger.Debugf("Could not read Model tag from %s: %v", path, err)
		}

		if focalTag, err := exifData.Get(exif.FocalLength); err == nil {
			if num, den, ok := focalTag.Rat2(0); ok && den != 0 {
				file.Metadata.FocalLength = float64(num) / float64(den)
			}
		} else {
			s.Logger.Debugf("Could not read FocalLength tag from %s: %v", path, err)
		}

		if apertureTag, err := exifData.Get(exif.FNumber); err == nil {
			if num, den, ok := apertureTag.Rat2(0); ok && den != 0 {
				file.Metadata.Aperture = float64(num) / float64(den)
			}
		} else {
			s.Logger.Debugf("Could not read FNumber tag from %s: %v", path, err)
		}

		if isoTag, err := exifData.Get(exif.ISOSpeedRatings); err == nil {
			if iso, ok := isoTag.Int(0); ok {
				file.Metadata.ISO = float64(iso)
			}
		} else {
			s.Logger.Debugf("Could not read ISOSpeedRatings tag from %s: %v", path, err)
		}

		if wbTag, err := exifData.Get(exif.WhiteBalance); err == nil {
			if wb, ok := wbTag.Int(0); ok {
				file.Metadata.WhiteBalance = strconv.Itoa(wb)
			}
		} else {
			s.Logger.Debugf("Could not read WhiteBalance tag from %s: %v", path, err)
		}

		if expBiasTag, err := exifData.Get(exif.ExposureBiasValue); err == nil {
			if num, den, ok := expBiasTag.Rat2(0); ok && den != 0 {
				file.Metadata.Exposure = float64(num) / float64(den)
			}
		} else {
			s.Logger.Debugf("Could not read ExposureBiasValue tag from %s: %v", path, err)
		}

		if flashTag, err := exifData.Get(exif.Flash); err == nil {
			if flash, ok := flashTag.Int(0); ok {
				file.Metadata.Flash = flash != 0
			}
		} else {
			s.Logger.Debugf("Could not read Flash tag from %s: %v", path, err)
		}
	}

	// Get image dimensions (resolution)
	imgConfig, err := s.getImageConfig(path)
	if err == nil {
		file.Metadata.ResolutionWidth = imgConfig.Width
		file.Metadata.ResolutionHeight = imgConfig.Height
	} else {
		// Log warning but don't fail metadata extraction just for dimensions
		s.Logger.Warnf("Error getting image dimensions for %s: %v", path, err)
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
			s.Logger.Debugf("No EXIF data found in %s", path)
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
