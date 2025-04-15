package model

import (
	"time"
)

type File struct {
	ID        int64 `gorm:"primarykey"`
	Filename  string
	Path      string
	Size      int64
	NasHost   string
	NasPath   string
	CreatedAt time.Time
	UpdatedAt time.Time
	Metadata  *PhotoMetadata `gorm:"embedded"`
}

type PhotoMetadata struct {
	CaptureTime time.Time
	Location    string
	ResolutionWidth  int
	ResolutionHeight int
	Exposure    float64
	Size        int64
	Device      string
	FocalLength float64
	Aperture    float64
	ISO         float64
	WhiteBalance string
	Flash       bool
}


func (m *File) TableName() string {
	return "file"
}
