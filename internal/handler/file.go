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
	fileService         service.FileService
	sourceConfigService service.SourceConfigService
	nasService          service.NasService
	localService        service.LocalService
	qiniuService        service.QiniuService
	// 后续可以添加其他存储服务，如七牛云服务等
}

func NewFileHandler(
	handler *Handler,
	fileService service.FileService,
	sourceConfigService service.SourceConfigService,
	nasService service.NasService,
	localService service.LocalService,
	qiniuService service.QiniuService,
) *FileHandler {
	return &FileHandler{
		Handler:             handler,
		fileService:         fileService,
		sourceConfigService: sourceConfigService,
		nasService:          nasService,
		localService:        localService,
		qiniuService:        qiniuService,
	}
}

// @Summary 统一文件上传接口
// @Schemes
// @Description 根据用户配置的默认存储类型上传文件到对应的存储位置
// @Tags 文件模块
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "文件"
// @Success 200 {object} v1.FileResponse
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
	sourceConfig, err := h.sourceConfigService.GetUserDefaultSourceConfig(c, userId)
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
		uploadErr = h.localService.UploadLocal(file, fileHeader.Filename, sourceConfig)
	case "nas":
		// NAS存储
		uploadErr = h.nasService.UploadFile(file, fileHeader.Filename, sourceConfig)
	case "qiniu":
		// 七牛云存储
		uploadErr = h.qiniuService.UploadQiniu(file, fileHeader.Filename, sourceConfig)
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

	// Assuming the upload service returns a file ID or file information
	// You might need to adjust this based on your actual implementation.
	// For this example, I'll assume it returns a file ID.
	//  Replace this with your actual file information retrieval logic
	// fileID, ok := result.(int64)
	// if !ok {
	// 	h.logger.WithContext(c).Error("上传文件后未返回有效的文件信息")
	// 	v1.HandleError(c, http.StatusInternalServerError, v1.ErrInternalServerError, "上传文件失败")
	// 	return
	// }

	// Retrieve file information using the file ID
	// fileInfo, err := h.fileService.GetFile(c, fileID)
	// if err != nil {
	// 	h.logger.WithContext(c).Error("获取文件信息失败", zap.Error(err), zap.Int64("file_id", fileID))
	// 	v1.HandleError(c, http.StatusInternalServerError, v1.ErrInternalServerError, "获取文件信息失败")
	// 	return
	// }
	v1.HandleSuccess(c, nil) // TODO: update with actual file info
}

// @Summary 扫描照片
// @Schemes
// @Description 扫描指定 Source Config 下的图片，提取并保存照片信息
// @Tags 文件模块
// @Produce json
// @Param source_config_id query int true "Source Config ID"
// @Success 200 {object} v1.Response
// @Router /scan-photos [post]
func (h *FileHandler) ScanPhotos(c *gin.Context) {
	sourceConfigID := c.Query("source_config_id")
	if sourceConfigID == "" {
		h.logger.WithContext(c).Error("Source Config ID 不能为空")
		v1.HandleError(c, http.StatusBadRequest, v1.ErrBadRequest, "Source Config ID 不能为空")
		return
	}

	err := h.fileService.ScanAndSavePhotos(c, sourceConfigID)
	if err != nil {
		h.logger.WithContext(c).Error("扫描照片失败", zap.Error(err), zap.String("source_config_id", sourceConfigID))
		v1.HandleError(c, http.StatusInternalServerError, v1.ErrInternalServerError, "扫描照片失败")
		return
	}

	v1.HandleSuccess(c, nil)
}

// @Summary 获取文件信息
// @Schemes
// @Description 根据文件 ID 获取文件信息
// @Tags 文件模块
// @Produce json
// @Param id path int true "File ID"
// @Success 200 {object} v1.FileResponse
// @Router /files/{id} [get]
func (h *FileHandler) GetFile(c *gin.Context) {
	// fileIDStr := c.Param("id")
	// fileID, err := strconv.ParseInt(fileIDStr, 10, 64)
	// if err != nil {
	// 	h.logger.WithContext(c).Error("无效的文件 ID", zap.Error(err), zap.String("file_id", fileIDStr))
	// 	v1.HandleError(c, http.StatusBadRequest, v1.ErrBadRequest, "无效的文件 ID")
	// 	return
	// }

	// file, err := h.fileService.GetFile(c, fileID)
	// if err != nil {
	// 	h.logger.WithContext(c).Error("获取文件信息失败", zap.Error(err), zap.Int64("file_id", fileID))
	// 	v1.HandleError(c, http.StatusInternalServerError, v1.ErrInternalServerError, "获取文件信息失败")
	// 	return
	// }

	// response := v1.FileResponse{ TODO: update response data
	// 	ID:       file.ID,
	// 	Filename: file.Filename,
	// }
	v1.HandleSuccess(c, nil)
}

// 获取当前用户ID的辅助方法
func (h *FileHandler) getCurrentUserId(ctx *gin.Context) uint {
    // 优先从claims中获取userId
    if userId := GetUserIdFromCtx(ctx); userId > 0 {
        return userId
    }

    // 从context中获取userId
    if val, exists := ctx.Get("userId"); exists {
        if userId, ok := val.(uint); ok {
            return userId
        }
    }

    return 0
}
