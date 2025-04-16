package repository

import (
	"context"
	"github.com/magiclz233/memorix/internal/model"
)

type FileRepository interface {
	GetFile(ctx context.Context, id int64) (*model.File, error)
	SaveFile(ctx context.Context, file *model.File) error
}

type fileRepository struct {
	*Repository
}

func (r *fileRepository) GetFile(ctx context.Context, id int64) (*model.File, error) {
	return &model.File{}, nil
}
func (r *fileRepository) SaveFile(ctx context.Context, file *model.File) error {
	result := r.DB(ctx).Create(file)
	return result.Error
}

func NewFileRepository(
	repository *Repository,
) FileRepository {
	return &fileRepository{
		Repository: repository,
	}
}
