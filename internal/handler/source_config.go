package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	v1 "github.com/magiclz233/memorix/api/v1"
	"github.com/magiclz233/memorix/internal/model"
	"github.com/magiclz233/memorix/internal/service"
	"go.uber.org/zap"
)

type SourceConfigHandler struct {
	*Handler
	sourceConfigService service.SourceConfigService
}

func NewSourceConfigHandler(
	handler *Handler,
	sourceConfigService service.SourceConfigService,
) *SourceConfigHandler {
	return &SourceConfigHandler{
		Handler:             handler,
		sourceConfigService: sourceConfigService,
	}
}

func (h *SourceConfigHandler) GetSourceConfig(ctx *gin.Context) {

}

func (h *SourceConfigHandler) AddSourceConfig(ctx *gin.Context) {
	var sourceConfig model.SourceConfig
	if err := ctx.ShouldBindJSON(&sourceConfig); err != nil {
		h.logger.WithContext(ctx).Warn("无效的请求体", zap.Error(err))
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, "请求参数错误")
		return
	}

	// Add user ID to the config
	userId := GetUserIdFromCtx(ctx)
	if userId == 0 {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}
	sourceConfig.UserId = userId

	flag, err := h.sourceConfigService.AddSourceConfig(ctx, &sourceConfig)
	if err != nil {
		// Log the specific error from the service
		h.logger.WithContext(ctx).Error("添加存储配置失败", zap.Error(err), zap.Uint("userId", userId))
		// Return a more specific error if possible, e.g., based on validation errors
		// For now, return a generic error, but include the service error message
		v1.HandleError(ctx, http.StatusInternalServerError, v1.ErrInternalServerError, "添加存储配置失败: "+err.Error())
		return
	}
	v1.HandleSuccess(ctx, flag)
}
