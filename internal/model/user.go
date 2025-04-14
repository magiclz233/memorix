package model

import (
	"gorm.io/gorm"
	"time"
)

type User struct {
	Id        uint   `gorm:"primarykey;comment:主键ID"`
	UserId    string `gorm:"unique;not null;comment:用户唯一标识"`
	Nickname  string `gorm:"not null;comment:用户昵称"`
	Password  string `gorm:"not null;comment:用户密码"`
	Email     string `gorm:"not null;comment:用户邮箱"`
	Phone     string `gorm:"type:varchar(100);comment:用户手机号"`
	Gender    int    `gorm:"type:tinyint;default:0;comment:性别 0-未知 1-男 2-女"` 
	Avatar    string `gorm:"type:varchar(255);comment:用户头像"`
	DefaultStorageId uint `gorm:"type:uint;comment:默认存储ID"`
	DefaultStorage string `gorm:"type:varchar(255);comment:默认存储类型"`
	Lang	string `gorm:"type:varchar(10);default:zh_CN;comment:用户语言偏好"`
	TimeZone	string `gorm:"type:varchar(100);default:Asia/Shanghai;comment:用户时区"`
	Status    int    `gorm:"type:tinyint;default:1;comment:用户状态 0-禁用 1-启用"` 
	DelFlag   int    `gorm:"type:tinyint;default:0;comment:删除标志 0-未删除 1-已删除"` 
	CreatedAt time.Time `gorm:"comment:创建时间"`
	UpdatedAt time.Time `gorm:"comment:更新时间"`
	DeletedAt gorm.DeletedAt `gorm:"index;comment:删除时间"`
}

func (u *User) TableName() string {
	return "users"
}
