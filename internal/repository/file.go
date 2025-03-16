package repository

import (
    "context"
	"github.com/magiclz233/memorix/internal/model"
)

type FileRepository interface {
	GetFile(ctx context.Context, id int64) (*model.File, error)
}

func NewFileRepository(
	repository *Repository,
) FileRepository {
	return &fileRepository{
		Repository: repository,
	}
}

type fileRepository struct {
	*Repository
}

func (r *fileRepository) GetFile(ctx context.Context, id int64) (*model.File, error) {
	var file model.File

	return &file, nil
}
