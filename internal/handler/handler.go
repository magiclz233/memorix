package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/magiclz233/memorix/pkg/jwt"
	"github.com/magiclz233/memorix/pkg/log"
)

type Handler struct {
	logger *log.Logger
}

func NewHandler(
	logger *log.Logger,
) *Handler {
	return &Handler{
		logger: logger,
	}
}
func GetUserIdFromCtx(ctx *gin.Context) uint {
	v, exists := ctx.Get("claims")
	if !exists {
		return 0
	}
	claims, ok := v.(*jwt.MyCustomClaims)
	if !ok {
		return 0
	}
	return claims.UserId
}
