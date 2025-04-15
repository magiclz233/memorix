package model

import (
	"time"

	"gorm.io/gorm"
)

type SourceConfig struct {
    gorm.Model
	UserId      int `json:"user_id" gorm:"not null"`
    Name        string `json:"name" gorm:"type:varchar(100);not null"`         // 配置名称
    Type        string `json:"type" gorm:"type:varchar(50);not null"`          // 来源类型：local/nas/qiniu/aliyun/onedrive 等
    Host        string `json:"host" gorm:"type:varchar(255)"`                  // 服务器地址，用于nas/云存储
    Port        int    `json:"port"`                                           // 端口号，用于nas连接
    Username    string `json:"username" gorm:"type:varchar(100)"`              // 用户名
    Password    string `json:"password" gorm:"type:varchar(255)"`              // 密码/访问密钥
    AccessKey   string `json:"access_key" gorm:"type:varchar(255)"`           // 访问密钥ID，用于云存储
    SecretKey   string `json:"secret_key" gorm:"type:varchar(255)"`           // 访问密钥密码，用于云存储
    Bucket      string `json:"bucket" gorm:"type:varchar(100)"`               // 存储桶名称，用于云存储
    Region      string `json:"region" gorm:"type:varchar(50)"`                // 区域，用于云存储
    BasePath    string `json:"base_path" gorm:"type:varchar(500)"`            // 基础路径，所有子目录的根目录
    Status      int    `json:"status" gorm:"type:tinyint;default:1"`          // 状态：1-启用 0-禁用
    ScanPeriod  int    `json:"scan_period" gorm:"default:3600"`              // 扫描周期（秒），用于定时扫描同步
    LastScanAt  time.Time  `json:"last_scan_at"`                                 // 上次扫描时间
    Description string `json:"description" gorm:"type:varchar(500)"`          // 描述信息
	DefaultPath string `json:"default_path" gorm:"type:varchar(500)"`          // 默认文件夹路径
}

func (m *SourceConfig) TableName() string {
    return "source_config"
}
