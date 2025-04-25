package model

import "gorm.io/gorm"

type VideoMetadata struct {
	gorm.Model
	ResolutionWidth  int      `gorm:"column:resolution_width;comment:视频宽度;not null" json:"resolution_width"`
	ResolutionHeight int      `gorm:"column:resolution_height;comment:视频高度;not null" json:"resolution_height"`
	Duration         float64  `gorm:"column:duration;comment:视频时长;not null" json:"duration"`
	Codec            *string  `gorm:"column:codec;comment:视频编码格式" json:"codec"`
	Framerate        *float64 `gorm:"column:framerate;comment:帧率" json:"framerate"`
	Bitrate          *string  `gorm:"column:bitrate;comment:比特率" json:"bitrate"`
	ColorProfile     *string  `gorm:"column:color_profile;comment:色彩配置" json:"color_profile"`
	Audio            *string  `gorm:"column:audio;comment:音频信息" json:"audio"`
}
