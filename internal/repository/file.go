package repository

import (
	"context"
	"github.com/magiclz233/memorix/internal/model"
)

type FileRepository interface {
	GetFile(ctx context.Context, id int64) (*model.File, error)
}

type fileRepository struct {
	*Repository
}

func (r *fileRepository) GetFile(ctx context.Context, id int64) (*model.File, error) {
	return &model.File{}, nil
}

func NewFileRepository(
	repository *Repository,
) FileRepository {
	return &fileRepository{
		Repository: repository,
	}
}
