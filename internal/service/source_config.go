package service

import (
    "context"
	"github.com/magiclz233/memorix/internal/model"
	"github.com/magiclz233/memorix/internal/repository"
)

type SourceConfigService interface {
	GetSourceConfig(ctx context.Context, id int64) (*model.SourceConfig, error)
}
func NewSourceConfigService(
    service *Service,
    sourceConfigRepository repository.SourceConfigRepository,
) SourceConfigService {
	return &sourceConfigService{
		Service:        service,
		sourceConfigRepository: sourceConfigRepository,
	}
}

type sourceConfigService struct {
	*Service
	sourceConfigRepository repository.SourceConfigRepository
}

func (s *sourceConfigService) GetSourceConfig(ctx context.Context, id int64) (*model.SourceConfig, error) {
	return s.sourceConfigRepository.GetSourceConfig(ctx, id)
}
