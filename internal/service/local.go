package service

import (
	"io"
	"github.com/magiclz233/memorix/internal/model"
)

type LocalService interface {
	UploadLocal(file io.Reader, filename string, sourceConfig *model.SourceConfig) error
}
func NewLocalService(
    service *Service,
) LocalService {
	return &localService{
		Service:        service,
	}
}

type localService struct {
	*Service
}

func (s *localService) UploadLocal(file io.Reader, filename string, sourceConfig *model.SourceConfig) error {
	return nil
}


