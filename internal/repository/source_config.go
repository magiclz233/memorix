package repository

import (
    "context"
	"github.com/magiclz233/memorix/internal/model"
)

type SourceConfigRepository interface {
	GetSourceConfig(ctx context.Context, id int64) (*model.SourceConfig, error)
}

func NewSourceConfigRepository(
	repository *Repository,
) SourceConfigRepository {
	return &sourceConfigRepository{
		Repository: repository,
	}
}

type sourceConfigRepository struct {
	*Repository
}

func (r *sourceConfigRepository) GetSourceConfig(ctx context.Context, id int64) (*model.SourceConfig, error) {
	var sourceConfig model.SourceConfig

	return &sourceConfig, nil
}
