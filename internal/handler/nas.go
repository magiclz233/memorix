package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	v1 "github.com/magiclz233/memorix/api/v1"
	"github.com/magiclz233/memorix/internal/service"
	"go.uber.org/zap"
)

type NasHandler struct {
	*Handler
	nasService service.NasService
	sourceConfigService service.SourceConfigService
}

func NewNasHandler(
	handler *Handler,
	nasService service.NasService,
	sourceConfigService service.SourceConfigService,
) *NasHandler {
	return &NasHandler{
		Handler:    handler,
		nasService: nasService,
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
		v1.HandleError(c, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}
	defer file.Close()

	// 获取NAS配置
	nasConfig, err := h.sourceConfigService.GetByUserIdAndType(c, 1, "nas")
	if err!= nil {
		h.logger.WithContext(c).Error("获取NAS配置失败", zap.Error(err))
		v1.HandleError(c, http.StatusInternalServerError, v1.ErrInternalServerError, nil)
		return
	}

	// 验证必要的参数
	if nasConfig.Host == "" || nasConfig.Name == "" || nasConfig.Password == "" || nasConfig.BasePath == "" {
		v1.HandleError(c, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	err = h.nasService.UploadFile(file, fileHeader.Filename, nasConfig)
	if err != nil {
		h.logger.WithContext(c).Error("上传文件到NAS失败", zap.Error(err))
		v1.HandleError(c, http.StatusInternalServerError, v1.ErrInternalServerError, nil)
		return
	}

	v1.HandleSuccess(c, nil)
}
