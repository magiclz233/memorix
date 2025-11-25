package service

import (
	"context"
	"errors"
	"time"

	v1 "github.com/magiclz233/memorix/api/v1"
	"github.com/magiclz233/memorix/internal/model"
	"github.com/magiclz233/memorix/internal/repository"
	"github.com/magiclz233/memorix/pkg/jwt"
	"golang.org/x/crypto/bcrypt"
)

type UserService interface {
	Register(ctx context.Context, req *v1.RegisterRequest) (*v1.LoginResponseData, error)
	Login(ctx context.Context, req *v1.LoginRequest) (*v1.LoginResponseData, error)
	RefreshToken(ctx context.Context, req *v1.RefreshTokenRequest) (*v1.LoginResponseData, error)
	GetProfile(ctx context.Context, userId uint) (*v1.GetProfileResponseData, error)
	UpdateProfile(ctx context.Context, userId uint, req *v1.UpdateProfileRequest) error
}

func NewUserService(
	service *Service,
	userRepo repository.UserRepository,
) UserService {
	return &userService{
		userRepo: userRepo,
		Service:  service,
	}
}

type userService struct {
	userRepo repository.UserRepository
	*Service
}

const (
	accessTokenTTL  = time.Hour * 24 * 90
	refreshTokenTTL = time.Hour * 24 * 180
)

func (s *userService) Register(ctx context.Context, req *v1.RegisterRequest) (*v1.LoginResponseData, error) {
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, v1.ErrInternalServerError
	}
	if err == nil && user != nil {
		return nil, v1.ErrEmailAlreadyUse
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	userName, err := s.sid.GenString()
	if err != nil {
		return nil, err
	}
	user = &model.User{
		UserName: userName,
		Email:    req.Email,
		Password: string(hashedPassword),
	}

	err = s.tm.Transaction(ctx, func(ctx context.Context) error {
		if err = s.userRepo.Create(ctx, user); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return s.generateTokens(user.Id)
}

func (s *userService) Login(ctx context.Context, req *v1.LoginRequest) (*v1.LoginResponseData, error) {
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, v1.ErrUnauthorized
		}
		return nil, err
	}
	if user == nil {
		return nil, v1.ErrUnauthorized
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, v1.ErrUnauthorized
	}

	return s.generateTokens(user.Id)
}

func (s *userService) RefreshToken(ctx context.Context, req *v1.RefreshTokenRequest) (*v1.LoginResponseData, error) {
	claims, err := s.jwt.ParseToken(req.RefreshToken)
	if err != nil {
		return nil, v1.ErrUnauthorized
	}
	if claims.TokenType != jwt.TokenTypeRefresh {
		return nil, v1.ErrUnauthorized
	}
	return s.generateTokens(claims.UserId)
}

func (s *userService) GetProfile(ctx context.Context, userId uint) (*v1.GetProfileResponseData, error) {
	user, err := s.userRepo.GetByID(ctx, userId)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, v1.ErrUnauthorized
		}
		return nil, err
	}

	return &v1.GetProfileResponseData{
		UserName:         user.UserName,
		Nickname:         user.Nickname,
		Email:            user.Email,
		Gender:           user.Gender,
		Avatar:           user.Avatar,
		DefaultStorageId: user.DefaultStorageId,
		DefaultStorage:   user.DefaultStorage,
		Lang:             user.Lang,
		TimeZone:         user.TimeZone,
	}, nil
}

func (s *userService) UpdateProfile(ctx context.Context, userId uint, req *v1.UpdateProfileRequest) error {
	user, err := s.userRepo.GetByID(ctx, userId)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return v1.ErrUnauthorized
		}
		return err
	}

	user.Email = req.Email
	user.Nickname = req.Nickname

	if err = s.userRepo.Update(ctx, user); err != nil {
		return err
	}

	return nil
}

func (s *userService) generateTokens(userId uint) (*v1.LoginResponseData, error) {
	accessToken, err := s.jwt.GenToken(userId, jwt.TokenTypeAccess, time.Now().Add(accessTokenTTL))
	if err != nil {
		return nil, err
	}
	refreshToken, err := s.jwt.GenToken(userId, jwt.TokenTypeRefresh, time.Now().Add(refreshTokenTTL))
	if err != nil {
		return nil, err
	}
	return &v1.LoginResponseData{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}
