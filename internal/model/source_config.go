package model

import "gorm.io/gorm"

type SourceConfig struct {
	gorm.Model
}

func (m *SourceConfig) TableName() string {
    return "source_config"
}
