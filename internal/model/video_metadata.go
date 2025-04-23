package model

import "gorm.io/gorm"

type VideoMetadata struct {
    gorm.Model
	Width        int     `gorm:"not null"`
	Height       int     `gorm:"not null"`
	Duration     float64 `gorm:"not null"`
	Codec        *string
	Framerate    *float64
	Bitrate      *string
	ColorProfile *string
	Audio        *string
}


