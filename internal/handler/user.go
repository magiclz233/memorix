package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	v1 "github.com/magiclz233/memorix/api/v1"
	"github.com/magiclz233/memorix/internal/service"
	"go.uber.org/zap"
)

type UserHandler struct {
	*Handler
	userService service.UserService
}

func NewUserHandler(handler *Handler, userService service.UserService) *UserHandler {
	return &UserHandler{
		Handler:     handler,
		userService: userService,
	}
}

// Register godoc
// @Summary 用户注册
// @Schemes
// @Description 目前只支持邮箱登录
// @Tags 用户模块
// @Accept json
// @Produce json
// @Param request body v1.RegisterRequest true "params"
// @Success 200 {object} v1.Response
// @Router /register [post]
func (h *UserHandler) Register(ctx *gin.Context) {
	req := new(v1.RegisterRequest)
	if err := ctx.ShouldBindJSON(req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	if err := h.userService.Register(ctx, req); err != nil {
		// Log the specific error from the service layer
		h.logger.WithContext(ctx).Error("userService.Register error", zap.Error(err))
		// Check for specific known errors from the service layer
		if err == v1.ErrEmailAlreadyUse {
			v1.HandleError(ctx, http.StatusBadRequest, err, nil)
		} else {
			// Return a generic internal server error for other cases
			v1.HandleError(ctx, http.StatusInternalServerError, v1.ErrInternalServerError, "注册失败")
		}
		return
	}

	v1.HandleSuccess(ctx, nil)
}

// Login godoc
// @Summary 账号登录
// @Schemes
// @Description
// @Tags 用户模块
// @Accept json
// @Produce json
// @Param request body v1.LoginRequest true "params"
// @Success 200 {object} v1.LoginResponse
// @Router /login [post]
func (h *UserHandler) Login(ctx *gin.Context) {
	var req v1.LoginRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	token, err := h.userService.Login(ctx, &req)
	if err != nil {
		// Log the specific error from the service layer
		h.logger.WithContext(ctx).Warn("userService.Login error", zap.Error(err)) // Use Warn for auth failures
		// Service layer should return specific v1 errors like ErrUnauthorized
		if err == v1.ErrUnauthorized {
			v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		} else {
			// Log unexpected errors as Error
			h.logger.WithContext(ctx).Error("Unexpected login error", zap.Error(err))
			v1.HandleError(ctx, http.StatusInternalServerError, v1.ErrInternalServerError, "登录失败")
		}
		return
	}
	v1.HandleSuccess(ctx, v1.LoginResponseData{
		AccessToken: token,
	})
}

// GetProfile godoc
// @Summary 获取用户信息
// @Schemes
// @Description
// @Tags 用户模块
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} v1.GetProfileResponse
// @Router /user [get]
func (h *UserHandler) GetProfile(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)
	if userId == 0 {
		v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		return
	}

	user, err := h.userService.GetProfile(ctx, userId)
	if err != nil {
		// Log the specific error from the service layer
		h.logger.WithContext(ctx).Error("userService.GetProfile error", zap.Error(err), zap.Uint("userId", userId))
		// Service layer should return specific v1 errors like ErrUnauthorized or ErrNotFound (mapped to Unauthorized)
		if err == v1.ErrUnauthorized {
			v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		} else {
			v1.HandleError(ctx, http.StatusInternalServerError, v1.ErrInternalServerError, "获取用户信息失败")
		}
		return
	}

	v1.HandleSuccess(ctx, user)
}

// UpdateProfile godoc
// @Summary 修改用户信息
// @Schemes
// @Description
// @Tags 用户模块
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body v1.UpdateProfileRequest true "params"
// @Success 200 {object} v1.Response
// @Router /user [put]
func (h *UserHandler) UpdateProfile(ctx *gin.Context) {
	userId := GetUserIdFromCtx(ctx)

	var req v1.UpdateProfileRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		v1.HandleError(ctx, http.StatusBadRequest, v1.ErrBadRequest, nil)
		return
	}

	if err := h.userService.UpdateProfile(ctx, userId, &req); err != nil {
		// Log the specific error from the service layer
		h.logger.WithContext(ctx).Error("userService.UpdateProfile error", zap.Error(err), zap.Uint("userId", userId))
		// Service layer should return specific v1 errors like ErrUnauthorized
		if err == v1.ErrUnauthorized {
			v1.HandleError(ctx, http.StatusUnauthorized, v1.ErrUnauthorized, nil)
		} else {
			v1.HandleError(ctx, http.StatusInternalServerError, v1.ErrInternalServerError, "更新用户信息失败")
		}
		return
	}

	v1.HandleSuccess(ctx, nil)
}
