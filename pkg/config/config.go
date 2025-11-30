package config

import (
	"fmt"
	"github.com/spf13/viper"
	"os"
	"path/filepath"
)

func NewConfig(p string) *viper.Viper {
	envConf := os.Getenv("APP_CONF")
	if envConf == "" {
		envConf = p
	}
	fmt.Println("load conf file:", envConf)
	return getConfig(envConf)
}

func getConfig(path string) *viper.Viper {
	path = resolveConfigPath(path)
	conf := viper.New()
	conf.SetConfigFile(path)
	err := conf.ReadInConfig()
	if err != nil {
		panic(err)
	}
	return conf
}

func resolveConfigPath(path string) string {
	if filepath.IsAbs(path) {
		return path
	}
	if _, err := os.Stat(path); err == nil {
		return path
	}
	cwd, err := os.Getwd()
	if err != nil {
		return path
	}
	for dir := cwd; dir != filepath.Dir(dir); dir = filepath.Dir(dir) {
		candidate := filepath.Join(dir, path)
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return path
}
