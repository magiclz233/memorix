package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/magiclz233/memorix/internal/service"
)

type FileHandler struct {
	*Handler
	fileService service.FileService
}

func NewFileHandler(
    handler *Handler,
    fileService service.FileService,
) *FileHandler {
	return &FileHandler{
		Handler:      handler,
		fileService: fileService,
	}
}

func (h *FileHandler) GetFile(ctx *gin.Context) {

}
