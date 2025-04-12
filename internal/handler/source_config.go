package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	v1 "github.com/magiclz233/memorix/api/v1"
	"github.com/magiclz233/memorix/internal/model"
	"github.com/magiclz233/memorix/internal/service"
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
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	flag, err := h.sourceConfigService.AddSourceConfig(ctx, &sourceConfig)
	if err != nil {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUserConfig, nil)
		return
	}
	v1.HandleSuccess(ctx, flag)
}
