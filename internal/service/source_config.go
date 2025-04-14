package service

import (
	"context"
	"fmt"

	"github.com/magiclz233/memorix/internal/model"
	"github.com/magiclz233/memorix/internal/repository"
)

type SourceConfigService interface {
	GetSourceConfig(ctx context.Context, id uint) (*model.SourceConfig, error)
	AddSourceConfig(ctx context.Context, config *model.SourceConfig) (bool, error)
	GetByUserIdAndType(ctx context.Context, userId uint, sourceType string) (*model.SourceConfig, error)
	GetUserDefaultSourceConfig(ctx context.Context, userId uint) (*model.SourceConfig, error)
}

func NewSourceConfigService(
	service *Service,
	userService UserService,
	sourceConfigRepository repository.SourceConfigRepository,
) SourceConfigService {
	return &sourceConfigService{
		Service:                service,
		userService:            userService,
		sourceConfigRepository: sourceConfigRepository,
	}
}

type sourceConfigService struct {
	*Service
	userService            UserService
	sourceConfigRepository repository.SourceConfigRepository
}

func (s *sourceConfigService) GetSourceConfig(ctx context.Context, id uint) (*model.SourceConfig, error) {
	return s.sourceConfigRepository.GetSourceConfig(ctx, id)
}

func (s *sourceConfigService) GetByUserIdAndType(ctx context.Context, userId uint, sourceType string) (*model.SourceConfig, error) {
	return s.sourceConfigRepository.GetByUserIdAndType(ctx, userId, sourceType)
}

func (s *sourceConfigService) GetUserDefaultSourceConfig(ctx context.Context, userId uint) (*model.SourceConfig, error) {
	if userId == 0 {
		return nil, fmt.Errorf("用户信息不能为空")
	}

	user, err := s.userService.GetProfile(ctx, userId)
	if err != nil {
		return nil, err
	}
	
	if user.DefaultStorageId > 0 {
		return s.GetSourceConfig(ctx, user.DefaultStorageId)
	}

	if user.DefaultStorage != "" {
		return s.GetByUserIdAndType(ctx, userId, user.DefaultStorage)
	}

	return nil, fmt.Errorf("未找到默认存储配置")
}

func (s *sourceConfigService) AddSourceConfig(ctx context.Context, sourceConfig *model.SourceConfig) (bool, error) {
	if sourceConfig == nil {
		return false, fmt.Errorf("配置信息不能为空")
	}
	// 根据不同类型处理配置信息
	switch sourceConfig.Type {
	case "local":
		// 解析本地存储配置

	case "nas":
		// 解析并加密 NAS 配置

	case "qiniu":
		// 解析并加密七牛云存储配置
	default:
		return false, fmt.Errorf("不支持的存储类型: %s", sourceConfig.Type)
	}
	err := s.sourceConfigRepository.Create(ctx, sourceConfig)
	if err != nil {
		return false, err
	}
	// 保存到数据库
	return true, nil
}
