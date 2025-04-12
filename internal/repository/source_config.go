package repository

import (
    "context"
	"github.com/magiclz233/memorix/internal/model"
)

type SourceConfigRepository interface {
	GetSourceConfig(ctx context.Context, id int64) (*model.SourceConfig, error)
	Create(ctx context.Context, config *model.SourceConfig) error
	Update(ctx context.Context, config *model.SourceConfig) error
	Delete(ctx context.Context, id uint) error
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

func (r *sourceConfigRepository) Create(ctx context.Context, config *model.SourceConfig) error {
	if err := r.DB(ctx).Create(config).Error; err != nil {
		return err
	}
	return nil
}

func (r *sourceConfigRepository) Update(ctx context.Context, config *model.SourceConfig) error {
	if err := r.DB(ctx).Save(config).Error; err != nil {
		return err
	}
	return nil
}

func (r *sourceConfigRepository) Delete(ctx context.Context, id uint) error {
	if err := r.DB(ctx).Delete(&model.SourceConfig{}, id).Error; err!= nil {
		return err
	}
	return nil
}



