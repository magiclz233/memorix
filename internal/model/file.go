package model

import (
	"time"
)

type File struct {
	Id        uint   `gorm:"primarykey;column:id;comment:主键ID"`
	Filename  string    `gorm:"column:filename;comment:文件名" json:"filename"`
	Path      string    `gorm:"column:path;comment:文件在NAS上的路径" json:"path"`
	Size      int64     `gorm:"column:size;comment:文件大小（字节）" json:"size"`
	NasHost   string    `gorm:"column:nas_host;comment:NAS服务器地址" json:"nas_host"`
	NasPath   string    `gorm:"column:nas_path;comment:NAS共享路径" json:"nas_path"`
	URL       string    `gorm:"column:url;comment:原图URL" json:"url"`
	ThumbURL  string    `gorm:"column:thumb_url;comment:缩略图URL" json:"thumb_url"`
	CreatedAt time.Time `gorm:"column:created_at;comment:创建时间" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at;comment:更新时间" json:"updated_at"`
	PhotoMetadata `gorm:"embedded;comment:图片元数据" json:"metadata"`
}

type PhotoMetadata struct {
	CaptureTime      time.Time `gorm:"column:capture_time;comment:拍摄时间" json:"capture_time"`
	Location         string    `gorm:"column:location;comment:拍摄地点" json:"location"`
	ResolutionWidth  int       `gorm:"column:resolution_width;comment:分辨率宽度" json:"resolution_width"`
	ResolutionHeight int       `gorm:"column:resolution_height;comment:分辨率高度" json:"resolution_height"`
	Exposure         float64   `gorm:"column:exposure;comment:曝光时间" json:"exposure"`
	Size             int64     `gorm:"column:meta_size;comment:图片元数据中的文件大小" json:"meta_size"`
	Device           string    `gorm:"column:device;comment:拍摄设备" json:"device"`
	FocalLength      float64   `gorm:"column:focal_length;comment:焦距" json:"focal_length"`
	Aperture         float64   `gorm:"column:aperture;comment:光圈" json:"aperture"`
	ISO              float64   `gorm:"column:iso;comment:ISO值" json:"iso"`
	WhiteBalance     string    `gorm:"column:white_balance;comment:白平衡" json:"white_balance"`
	Flash            bool      `gorm:"column:flash;comment:是否使用闪光灯" json:"flash"`
}


func (m *File) TableName() string {
	return "file"
}
