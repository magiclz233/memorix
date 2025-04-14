package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	v1 "github.com/magiclz233/memorix/api/v1"
	"github.com/magiclz233/memorix/internal/service"
	"go.uber.org/zap"
)

type FileHandler struct {
	*Handler
	fileService        service.FileService
	sourceConfigService service.SourceConfigService
	nasService         service.NasService
	// 后续可以添加其他存储服务，如七牛云服务等
}

func NewFileHandler(
	handler *Handler,
	fileService service.FileService,
	sourceConfigService service.SourceConfigService,
	nasService service.NasService,
) *FileHandler {
	return &FileHandler{
		Handler:            handler,
		fileService:        fileService,
		sourceConfigService: sourceConfigService,
		nasService:         nasService,
	}
}

// @Summary 统一文件上传接口
// @Schemes
// @Description 根据用户配置的默认存储类型上传文件到对应的存储位置
// @Tags 文件模块
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "文件"
// @Success 200 {object} v1.Response
// @Router /upload [post]
func (h *FileHandler) UploadFile(c *gin.Context) {
	// 获取当前用户ID
	userId := h.getCurrentUserId(c)
	if userId == 0 {
		v1.HandleError(c, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	// 获取上传文件
	file, fileHeader, err := c.Request.FormFile("file")
	if err != nil {
		h.logger.WithContext(c).Error("获取上传文件失败", zap.Error(err))
		v1.HandleError(c, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}
	defer file.Close()

	// 获取用户默认存储配置
	sourceConfig, err := h.sourceConfigService.GetDefaultByUserId(c, userId)
	if err != nil {
		h.logger.WithContext(c).Error("获取用户默认存储配置失败", zap.Error(err))
		v1.HandleError(c, http.StatusInternalServerError, v1.ErrInternalServerError, nil)
		return
	}

	// 验证必要的参数
	if sourceConfig == nil || sourceConfig.Type == "" {
		h.logger.WithContext(c).Error("用户未配置默认存储类型")
		v1.HandleError(c, http.StatusBadRequest, v1.ErrBadRequest, "请先配置默认存储类型")
		return
	}

	// 根据存储类型选择对应的存储服务
	var uploadErr error
	switch sourceConfig.Type {
	case "local":
		// 本地存储
		uploadErr = h.fileService.UploadToLocal(file, fileHeader.Filename, sourceConfig)
	case "nas":
		// NAS存储
		uploadErr = h.nasService.UploadFile(file, fileHeader.Filename, sourceConfig)
	case "qiniu":
		// 七牛云存储
		uploadErr = h.fileService.UploadToQiniu(file, fileHeader.Filename, sourceConfig)
	default:
		h.logger.WithContext(c).Error("不支持的存储类型", zap.String("type", sourceConfig.Type))
		v1.HandleError(c, http.StatusBadRequest, v1.ErrBadRequest, "不支持的存储类型")
		return
	}

	if uploadErr != nil {
		h.logger.WithContext(c).Error("上传文件失败", zap.Error(uploadErr), zap.String("type", sourceConfig.Type))
		v1.HandleError(c, http.StatusInternalServerError, v1.ErrInternalServerError, nil)
		return
	}

	v1.HandleSuccess(c, nil)
}

// 获取当前用户ID的辅助方法
func (h *FileHandler) getCurrentUserId(c *gin.Context) int64 {
	// 从上下文中获取用户ID，具体实现可能需要根据您的认证中间件调整
	userId, exists := c.Get("userId")
	if !exists {
		return 0
	}
	
	// 类型断言
	if id, ok := userId.(int64); ok {
		return id
	}
	return 0
}