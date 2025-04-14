package service

import (
	"io"
	"github.com/magiclz233/memorix/internal/model"
)

type QiniuService interface {
	UploadQiniu(file io.Reader, filename string, sourceConfig *model.SourceConfig) error
}
func NewQiniuService(
    service *Service,
) QiniuService {
	return &qiniuService{
		Service:        service,
	}
}

type qiniuService struct {
	*Service
}

func (s *qiniuService) UploadQiniu(file io.Reader, filename string, sourceConfig *model.SourceConfig) error {
	return nil
}
