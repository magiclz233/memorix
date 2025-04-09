package handler

import (
	"github.com/gin-gonic/gin"
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
		Handler:      handler,
		sourceConfigService: sourceConfigService,
	}
}

func (h *SourceConfigHandler) GetSourceConfig(ctx *gin.Context) {

}
