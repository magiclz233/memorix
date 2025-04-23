package model

import (
	"time"
)

type File struct {
	Id        uint   `gorm:"primarykey;column:id;comment:主键ID"`
	Filename  string    `gorm:"column:filename;comment:文件名" json:"filename"`
	Path      string    `gorm:"column:path;comment:文件在NAS上的路径" json:"path"`
	SourceType string    `gorm:"column:source_type;comment:文件来源类型" json:"source_type"`
	Size      int64     `gorm:"column:size;comment:文件大小（字节）" json:"size"`
	URL       string    `gorm:"column:url;comment:原图URL" json:"url"`
	ThumbURL  string    `gorm:"column:thumb_url;comment:缩略图URL" json:"thumb_url"`
	CreatedAt time.Time `gorm:"column:created_at;comment:创建时间" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at;comment:更新时间" json:"updated_at"`
	PhotoMetadata `gorm:"embedded;comment:图片元数据" json:"metadata"`
}

func (m *File) TableName() string {
	return "file"
}
