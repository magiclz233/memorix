package service

import (
	"context"
	"fmt"
	"io"
	"path/filepath"

	"github.com/magiclz233/memorix/internal/repository"
	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

type NasService interface {
	UploadFile(ctx context.Context, file io.Reader, filename string, nasConfig NasConfig) error
	GetNasClient(nasConfig NasConfig) (*sftp.Client, error) // 抽取NAS连接逻辑
}

type NasConfig struct {
	Host     string
	Name     string
	Password string
	Path     string
}

type nasService struct {
	*Service
	fileRepository repository.FileRepository // 添加文件仓储依赖
}

func NewNasService(service *Service, fileRepository repository.FileRepository) NasService {
	return &nasService{
		Service:        service,
		fileRepository: fileRepository,
	}
}

func (s *nasService) GetNasClient(nasConfig NasConfig) (*sftp.Client, error) {
	config := ssh.ClientConfig{
		User: nasConfig.Name,
		Auth: []ssh.AuthMethod{
			ssh.Password(nasConfig.Password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	client, err := ssh.Dial("tcp", fmt.Sprintf("%s:22", nasConfig.Host), &config)
	if err != nil {
		return nil, fmt.Errorf("无法连接到NAS服务器: %v", err)
	}

	sftpClient, err := sftp.NewClient(client)
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("无法创建SFTP客户端: %v", err)
	}

	return sftpClient, nil
}

func (s *nasService) UploadFile(ctx context.Context, file io.Reader, filename string, nasConfig NasConfig) error {
	// 获取NAS客户端
	sftpClient, err := s.GetNasClient(nasConfig)
	if err != nil {
		return err
	}
	defer sftpClient.Close()

	// 直接上传文件
	if err := s.uploadToNas(sftpClient, file, filename, nasConfig.Path); err != nil {
		return err
	}

	return nil
}

func (s *nasService) uploadToNas(client *sftp.Client, file io.Reader, filename, path string) error {
	if err := client.MkdirAll(path); err != nil {
		return fmt.Errorf("无法创建目录: %v", err)
	}

	dstPath := filepath.Join(path, filename)
	dstFile, err := client.Create(dstPath)
	if err != nil {
		return fmt.Errorf("无法创建文件: %v", err)
	}
	defer dstFile.Close()

	if _, err = io.Copy(dstFile, file); err != nil {
		return fmt.Errorf("无法上传文件: %v", err)
	}
	return nil
}
