package service

import (
    "context"
	"fmt"
	"image"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/magiclz233/memorix/internal/model"
	"github.com/magiclz233/memorix/internal/repository"
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
			s.Logger.Errorf("Error saving file metadata for %s: %v", file.Filename, err)
		}
	}

	return nil
}

func (s *fileService) ScanPhotos(ctx context.Context, dirPath string) ([]*model.File, error) {
	var files []*model.File

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
			return nil
		}

		file, err := s.extractPhotoMetadata(path)
		if err != nil {
			s.Logger.Warnf("Error extracting metadata from %s: %v", path, err)
			return nil // Continue to next file
		}

		files = append(files, file)
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("error scanning directory: %w", err)
	}

	return files, nil
}

func (s *fileService) extractPhotoMetadata(path string) (*model.File, error) {
	fileInfo, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("error getting file info: %w", err)
	}

	file := &model.File{
		Filename:  fileInfo.Name(),
		Path:      path,
		Size:      fileInfo.Size(),
		CreatedAt: time.Now(), // Placeholder
		UpdatedAt: time.Now(), // Placeholder
		Metadata:  &model.PhotoMetadata{},
	}

	exifData, err := s.readEXIFData(path)
	if err != nil {
		s.Logger.Warnf("Error reading EXIF data from %s: %v", path, err)
		// Continue without EXIF data
	}

	if exifData != nil {
		if timeTag, err := exifData.DateTime(); err == nil {
			file.Metadata.CaptureTime = timeTag
		}

		if lat, long, err := exifData.LatLong(); err == nil {
			file.Metadata.Location = fmt.Sprintf("%f,%f", lat, long)
		}

		if modelTag, err := exifData.Get(exif.Model); err == nil {
			file.Metadata.Device, _ = modelTag.StringVal()
		}

		if focalTag, err := exifData.Get(exif.FocalLength); err == nil {
			num, den, _ := focalTag.Rat2(0)
			file.Metadata.FocalLength = float64(num) / float64(den)
		}

		if apertureTag, err := exifData.Get(exif.FNumber); err == nil {
			num, den, _ := apertureTag.Rat2(0)
			file.Metadata.Aperture = float64(num) / float64(den)
		}

		if isoTag, err := exifData.Get(exif.ISOSpeedRatings); err == nil {
			iso, _ := isoTag.Int(0)
			file.Metadata.ISO = float64(iso)
		}

		if wbTag, err := exifData.Get(exif.WhiteBalance); err == nil {
			wb, _ := wbTag.Int(0)
			file.Metadata.WhiteBalance = strconv.Itoa(wb)
		}

		if expBiasTag, err := exifData.Get(exif.ExposureBiasValue); err == nil {
			num, den, _ := expBiasTag.Rat2(0)
			file.Metadata.Exposure = float64(num) / float64(den)
		}

		if flashTag, err := exifData.Get(exif.Flash); err == nil {
			flash, _ := flashTag.Int(0)
			file.Metadata.Flash = flash != 0
		}
	}

	// Get image dimensions (resolution)
	imgConfig, err := s.getImageConfig(path)
	if err == nil {
		file.Metadata.ResolutionWidth = imgConfig.Width
		file.Metadata.ResolutionHeight = imgConfig.Height
	} else {
		s.Logger.Warnf("Error getting image dimensions for %s: %v", path, err)
	}

	return file, nil
}

func (s *fileService) readEXIFData(path string) (*exif.Exif, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("error opening file: %w", err)
	}
	defer f.Close()

	exifData, xerr := exif.Decode(f)
	if xerr != nil {
		return nil, fmt.Errorf("error decoding EXIF data: %w", xerr)
	}

	return exifData, nil
}

func (s *fileService) getImageConfig(path string) (image.Config, error) {
	file, err := os.Open(path)
	if err != nil {
		return image.Config{}, fmt.Errorf("failed to open image file: %w", err)
	}
	defer file.Close()

	imgConfig, _, err := image.DecodeConfig(file)
	if err != nil {
		return image.Config{}, fmt.Errorf("failed to decode image config: %w", err)
	}

	return imgConfig, nil
}
