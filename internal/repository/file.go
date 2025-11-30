package repository

import (
	"context"
	"errors"

	"github.com/magiclz233/memorix/internal/model"
	"gorm.io/gorm"
)

type FileRepository interface {
	GetFile(ctx context.Context, id int64) (*model.File, error)
	SaveFile(ctx context.Context, file *model.File) error
	ListFiles(ctx context.Context, userId uint, sourceConfigId uint, page int, pageSize int) ([]model.File, error)
	BatchSaveFiles(ctx context.Context, files []*model.File) error
}

type fileRepository struct {
	*Repository
}

func (r *fileRepository) GetFile(ctx context.Context, id int64) (*model.File, error) {
	var file model.File
	if err := r.DB(ctx).First(&file, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &file, nil
}
func (r *fileRepository) SaveFile(ctx context.Context, file *model.File) error {
	result := r.DB(ctx).Create(file)
	return result.Error
}

func (r *fileRepository) BatchSaveFiles(ctx context.Context, files []*model.File) error {
	if len(files) == 0 {
		return nil
	}
	return r.DB(ctx).CreateInBatches(files, len(files)).Error
}

func (r *fileRepository) ListFiles(ctx context.Context, userId uint, sourceConfigId uint, page int, pageSize int) ([]model.File, error) {
	var list []model.File

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	err := r.DB(ctx).
		Offset(offset).
		Limit(pageSize).
		Order("date_shot DESC, created_at DESC").
		Find(&list).Error
	return list, err
}

func NewFileRepository(
	repository *Repository,
) FileRepository {
	return &fileRepository{
		Repository: repository,
	}
}
