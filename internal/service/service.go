package service

import (
	"github.com/magiclz233/memorix/internal/repository"
	"github.com/magiclz233/memorix/pkg/jwt"
	"github.com/magiclz233/memorix/pkg/log"
	"github.com/magiclz233/memorix/pkg/sid"
)

type Service struct {
	logger *log.Logger
	sid    *sid.Sid
	jwt    *jwt.JWT
	tm     repository.Transaction
}

func NewService(
	tm repository.Transaction,
	logger *log.Logger,
	sid *sid.Sid,
	jwt *jwt.JWT,
) *Service {
	return &Service{
		logger: logger,
		sid:    sid,
		jwt:    jwt,
		tm:     tm,
	}
}
