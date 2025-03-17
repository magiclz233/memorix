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


func (m *File) TableName() string {
	return "file"
}
