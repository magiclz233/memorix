package model

import (
	"gorm.io/gorm"
)

type SourcePath struct {
    gorm.Model
    SourceID    uint   `json:"source_id" gorm:"index"`                    // 关联的源配置ID
    Path        string `json:"path" gorm:"type:varchar(500);not null"`    // 具体的扫描路径
    Include     string `json:"include" gorm:"type:varchar(255)"`          // 包含的文件类型，如: *.jpg,*.png
    Exclude     string `json:"exclude" gorm:"type:varchar(255)"`          // 排除的文件或目录
    Status      int    `json:"status" gorm:"type:tinyint;default:1"`      // 状态：1-启用 0-禁用
    Description string `json:"description" gorm:"type:varchar(500)"`      // 描述信息
}

func (m *SourcePath) TableName() string {
    return "source_path"
}
