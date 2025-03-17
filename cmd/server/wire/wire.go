//go:build wireinject
// +build wireinject

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

var repositorySet = wire.NewSet(
	repository.NewDB,
	//repository.NewRedis,
	repository.NewRepository,
	repository.NewTransaction,
	repository.NewUserRepository,
	repository.NewFileRepository, // 保留文件仓储，但不需要数据库操作
)

var serviceSet = wire.NewSet(
	service.NewService,
	service.NewUserService,
	service.NewNasService,
)

var handlerSet = wire.NewSet(
	handler.NewHandler,
	handler.NewUserHandler,
	handler.NewNasHandler,
)

var serverSet = wire.NewSet(
	server.NewHTTPServer,
	server.NewJob,
)

// build App
func newApp(
	httpServer *http.Server,
	job *server.Job,
	// task *server.Task,
) *app.App {
	return app.NewApp(
		app.WithServer(httpServer, job),
		app.WithName("demo-server"),
	)
}

func NewWire(*viper.Viper, *log.Logger) (*app.App, func(), error) {
	panic(wire.Build(
		repositorySet,
		serviceSet,
		handlerSet,
		serverSet,
		sid.NewSid,
		jwt.NewJwt,
		newApp,
	))
}
