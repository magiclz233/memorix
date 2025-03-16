package model

import "gorm.io/gorm"

type File struct {
	gorm.Model
}

func (m *File) TableName() string {
    return "file"
}
