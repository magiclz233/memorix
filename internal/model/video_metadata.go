package model

import "gorm.io/gorm"

type VideoMetadata struct {
	gorm.Model
	ResolutionWidth  int     `gorm:"not null"`
	ResolutionHeight int     `gorm:"not null"`
	Duration         float64 `gorm:"not null"`
	Codec            *string
	Framerate        *float64
	Bitrate          *string
	ColorProfile     *string
	Audio            *string
}
