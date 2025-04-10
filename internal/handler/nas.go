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
}

func NewNasHandler(
	handler *Handler,
	nasService service.NasService,
) *NasHandler {
	return &NasHandler{
		Handler:    handler,
		nasService: nasService,
	}
}

// UploadToNas godoc
// @Summary 上传文件到NAS
// @Schemes
// @Description 上传文件到指定的NAS服务器
// @Tags NAS模块
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "文件"
// @Param nasHost formData string true "NAS服务器地址"
// @Param nasUsername formData string true "NAS用户名"
// @Param nasPassword formData string true "NAS密码"
// @Param nasPath formData string true "NAS存储路径"
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

	nasConfig := service.NasConfig{
		Host:     c.PostForm("nasHost"),
		Name:     c.PostForm("nasUsername"),
		Password: c.PostForm("nasPassword"),
		Path:     c.PostForm("nasPath"),
	}

	// 验证必要的参数
	if nasConfig.Host == "" || nasConfig.Name == "" || nasConfig.Password == "" || nasConfig.Path == "" {
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
