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
}

type NasConfig struct {
	Host     string
	Name     string
	Password string
	Path     string
}

func (m *File) TableName() string {
	return "file"
}
