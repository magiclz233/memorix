package model

import (
	"time"

	"gorm.io/gorm"
)

type PhotoMetadata struct {
	gorm.Model
	Description      *string    `gorm:"column:description;comment:描述" json:"description"`
	Camera           *string    `gorm:"column:camera;comment:相机型号" json:"camera"`
	Maker            *string    `gorm:"column:maker;comment:制造商" json:"maker"`
	Lens             *string    `gorm:"column:lens;comment:镜头型号" json:"lens"`
	DateShot         *time.Time `gorm:"column:date_shot;comment:拍摄日期" json:"date_shot"`
	Exposure         *float64   `gorm:"column:exposure;comment:曝光时间" json:"exposure"`
	Aperture         *float64   `gorm:"column:aperture;comment:光圈值" json:"aperture"`
	Iso              *int64     `gorm:"column:iso;comment:ISO值" json:"iso"`
	FocalLength      *float64   `gorm:"column:focal_length;comment:焦距" json:"focal_length"`
	Flash            *int64     `gorm:"column:flash;comment:闪光灯状态" json:"flash"`
	Orientation      *int64     `gorm:"column:orientation;comment:方向" json:"orientation"`
	ExposureProgram  *int64     `gorm:"column:exposure_program;comment:曝光程序" json:"exposure_program"`
	GPSLatitude      *float64   `gorm:"column:gps_latitude;comment:GPS纬度" json:"gps_latitude"`
	GPSLongitude     *float64   `gorm:"column:gps_longitude;comment:GPS经度" json:"gps_longitude"`
	ResolutionWidth  *int        `gorm:"column:resolution_width;comment:图片宽度" json:"resolution_width"`
	ResolutionHeight *int        `gorm:"column:resolution_height;comment:图片高度" json:"resolution_height"`
	WhiteBalance     *string    `gorm:"column:white_balance;comment:白平衡" json:"white_balance"`
}
