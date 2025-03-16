package service

import (
    "context"
	"github.com/magiclz233/memorix/internal/model"
	"github.com/magiclz233/memorix/internal/repository"
)

type FileService interface {
	GetFile(ctx context.Context, id int64) (*model.File, error)
}
func NewFileService(
    service *Service,
    fileRepository repository.FileRepository,
) FileService {
	return &fileService{
		Service:        service,
		fileRepository: fileRepository,
	}
}

type fileService struct {
	*Service
	fileRepository repository.FileRepository
}

func (s *fileService) GetFile(ctx context.Context, id int64) (*model.File, error) {
	return s.fileRepository.GetFile(ctx, id)
}
