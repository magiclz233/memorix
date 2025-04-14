package repository

import (
	"context"
	"github.com/magiclz233/memorix/internal/model"
)

type SourceConfigRepository interface {
	GetSourceConfig(ctx context.Context, id uint) (*model.SourceConfig, error)
	GetByUserIdAndType(ctx context.Context, userId uint, t string) (*model.SourceConfig, error)
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

func (r *sourceConfigRepository) GetSourceConfig(ctx context.Context, id uint) (*model.SourceConfig, error) {
	var sourceConfig model.SourceConfig
	if err := r.DB(ctx).First(&sourceConfig, id).Error; err != nil {
		return nil, err
	}
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
	if err := r.DB(ctx).Delete(&model.SourceConfig{}, id).Error; err != nil {
		return err
	}
	return nil
}

func (r *sourceConfigRepository) GetByUserIdAndType(ctx context.Context, userId uint, t string) (*model.SourceConfig, error) {
	var config model.SourceConfig
	err := r.DB(ctx).Where("user_id = ? AND type = ?", userId, t).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}
