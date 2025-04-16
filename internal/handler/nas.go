package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	v1 "github.com/magiclz233/memorix/api/v1"
	"github.com/magiclz233/memorix/internal/repository" // Import repository for ErrNotFound check
	"github.com/magiclz233/memorix/internal/service"
	"go.uber.org/zap"
)

type NasHandler struct {
	*Handler
	nasService          service.NasService
	sourceConfigService service.SourceConfigService
}

func NewNasHandler(
	handler *Handler,
	nasService service.NasService,
	sourceConfigService service.SourceConfigService,
) *NasHandler {
	return &NasHandler{
		Handler:             handler,
		nasService:          nasService,
		sourceConfigService: sourceConfigService,
	}
}

// @Summary 上传文件到NAS
// @Schemes
// @Description 上传文件到指定的NAS服务器
// @Tags NAS模块
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "文件"
// @Success 200 {object} v1.Response
// @Router /upload/nas [post]
func (h *NasHandler) UploadToNas(c *gin.Context) {
	file, fileHeader, err := c.Request.FormFile("file")
	if err != nil {
		h.logger.WithContext(c).Error("获取上传文件失败", zap.Error(err))
		v1.HandleError(c, http.StatusBadRequest, v1.ErrBadRequest, "获取上传文件失败")
		return
	}
	defer file.Close()

	// 获取当前用户ID
	userId := GetUserIdFromCtx(c) // Use the helper function from handler.go
	if userId == 0 {
		v1.HandleError(c, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	// 获取NAS配置
	nasConfig, err := h.sourceConfigService.GetByUserIdAndType(c, userId, "nas")
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) { // Check for ErrNotFound from repository
			h.logger.WithContext(c).Warn("用户未配置NAS存储", zap.Uint("userId", userId))
			v1.HandleError(c, http.StatusBadRequest, v1.ErrBadRequest, "NAS存储未配置")
		} else {
			h.logger.WithContext(c).Error("获取NAS配置失败", zap.Error(err), zap.Uint("userId", userId))
			v1.HandleError(c, http.StatusInternalServerError, v1.ErrInternalServerError, "获取NAS配置失败")
		}
		return
	}

	// 验证必要的参数 (SourceConfig model might not directly expose Password)
	// Assuming GetByUserIdAndType returns a valid config if no error
	if nasConfig == nil || nasConfig.Host == "" || nasConfig.Name == "" || nasConfig.BasePath == "" { // Check if config or essential fields are missing
		h.logger.WithContext(c).Error("NAS配置信息不完整", zap.Uint("userId", userId), zap.Uint("configId", nasConfig.ID))
		v1.HandleError(c, http.StatusBadRequest, v1.ErrBadRequest, "NAS配置信息不完整")
		return
	}

	err = h.nasService.UploadFile(file, fileHeader.Filename, nasConfig)
	if err != nil {
		// Log the specific error from the service layer
		h.logger.WithContext(c).Error("上传文件到NAS失败", zap.Error(err), zap.Uint("userId", userId), zap.Uint("configId", nasConfig.ID))
		// Return a more informative error message if possible, otherwise generic internal error
		v1.HandleError(c, http.StatusInternalServerError, v1.ErrInternalServerError, "上传文件到NAS失败: "+err.Error())
		return
	}

	v1.HandleSuccess(c, nil)
}
