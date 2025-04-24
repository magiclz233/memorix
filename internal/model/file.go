package model

import (
	"gorm.io/gorm"
)

type File struct {
	gorm.Model
	Title  string    `gorm:"column:title;comment:媒体文件的标题" json:"title"`
	Path      string    `gorm:"column:path;comment:媒体文件的路径" json:"path"`
	SourceType string    `gorm:"column:source_type;comment:文件来源类型" json:"source_type"`
	Size      int64     `gorm:"column:size;comment:文件大小（字节）" json:"size"`
	URL       string    `gorm:"column:url;comment:原图URL" json:"url"`
	ThumbURL  string    `gorm:"column:thumb_url;comment:缩略图URL" json:"thumb_url"`
	PhotoMetadata `gorm:"embedded;comment:图片元数据" json:"metadata"`
}

func (m *File) TableName() string {
	return "file"
}
