// Code generated by Wire. DO NOT EDIT.

//go:generate go run -mod=mod github.com/google/wire/cmd/wire
//go:build !wireinject
// +build !wireinject

package wire

import (
	"github.com/google/wire"
	"github.com/magiclz233/memorix/internal/handler"
	"github.com/magiclz233/memorix/internal/repository"
	"github.com/magiclz233/memorix/internal/server"
	"github.com/magiclz233/memorix/internal/service"
	"github.com/magiclz233/memorix/pkg/app"
	"github.com/magiclz233/memorix/pkg/jwt"
	"github.com/magiclz233/memorix/pkg/log"
	"github.com/magiclz233/memorix/pkg/server/http"
	"github.com/magiclz233/memorix/pkg/sid"
	"github.com/spf13/viper"
)

// Injectors from wire.go:

func NewWire(viperViper *viper.Viper, logger *log.Logger) (*app.App, func(), error) {
	jwtJWT := jwt.NewJwt(viperViper)
	handlerHandler := handler.NewHandler(logger)
	db := repository.NewDB(viperViper, logger)
	repositoryRepository := repository.NewRepository(logger, db)
	transaction := repository.NewTransaction(repositoryRepository)
	sidSid := sid.NewSid()
	serviceService := service.NewService(transaction, logger, sidSid, jwtJWT)
	userRepository := repository.NewUserRepository(repositoryRepository)
	userService := service.NewUserService(serviceService, userRepository)
	userHandler := handler.NewUserHandler(handlerHandler, userService)
	fileRepository := repository.NewFileRepository(repositoryRepository)
	nasService := service.NewNasService(serviceService, fileRepository)
	sourceConfigRepository := repository.NewSourceConfigRepository(repositoryRepository)
	sourceConfigService := service.NewSourceConfigService(serviceService, userService, sourceConfigRepository)
	nasHandler := handler.NewNasHandler(handlerHandler, nasService, sourceConfigService)
	sourceConfigHandler := handler.NewSourceConfigHandler(handlerHandler, sourceConfigService)
	httpServer := server.NewHTTPServer(logger, viperViper, jwtJWT, userHandler, nasHandler, sourceConfigHandler, )
	job := server.NewJob(logger)
	appApp := newApp(httpServer, job)
	return appApp, func() {
	}, nil
}

// wire.go:

var repositorySet = wire.NewSet(repository.NewDB, repository.NewRepository, repository.NewTransaction, repository.NewUserRepository, repository.NewFileRepository, repository.NewSourceConfigRepository)

var serviceSet = wire.NewSet(service.NewService, service.NewUserService, service.NewSourceConfigService, service.NewFileService, service.NewLocalService, service.NewNasService, service.NewQiniuService)

var handlerSet = wire.NewSet(handler.NewHandler, handler.NewUserHandler, handler.NewFileHandler, handler.NewNasHandler, handler.NewSourceConfigHandler)

var serverSet = wire.NewSet(server.NewHTTPServer, server.NewJob)

// build App
func newApp(
	httpServer *http.Server,
	job *server.Job,

) *app.App {
	return app.NewApp(app.WithServer(httpServer, job), app.WithName("demo-server"))
}
