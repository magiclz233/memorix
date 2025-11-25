# 仓库指南

## 项目结构与模块组织
- `cmd/` 存放入口（`server`、`migration`、`task`）；`internal/` 包含 handler、service、repository、middleware 以及 server wiring；公共辅助方法在 `pkg/`。
- API 定义及生成的 swagger 在 `docs/`；配置示例在 `config/`（`local.yml`、`prod.yml`）。
- 持久化资源和日志位于 `storage/`；集成测试与 mock 放在 `test/`（`test/server/{handler,service,repository}`）。
- 部署产物在 `deploy/`（Dockerfile、compose），工具脚本在 `scripts/`。

## 构建、测试与开发命令
- `make init` 安装所需工具（wire、mockgen、swag）。
- `make bootstrap` 拉起 compose 栈、执行迁移，并通过 `nunu run ./cmd/server` 启动服务。
- `make build` 编译精简符号的 server 二进制到 `./bin/server`；`make docker` 构建并运行演示镜像。
- `make swag` 基于 `cmd/server/main.go` 刷新 swagger 文档。
- `make test` 运行聚焦覆盖率的测试（`./test/server/...`），输出 `coverage.out` 与 `coverage.html` 便于审阅。

## 代码风格与命名约定
- Go 1.24+：提交前运行 `gofmt`；遵循惯用命名（导出用 `CamelCase`，内部用 `camelCase`，测试文件以 `_test.go` 结尾）。
- Handler 尽量精简，业务下沉到 service；repository 只负责数据访问。
- 倾向依赖注入（支持 wire 的构造函数），配置读取集中在 `pkg/config`。
- 使用 `pkg/log` 记录结构化日志；尽量带上请求 ID 或用户 ID。

## 测试规范
- 测试按领域放在 `test/server/...`，命名为 `TestXxx` 并优先采用表格驱动。
- HTTP 面测试使用 `testify` 断言与 `httpexpect`；接口变更时优先使用 `test/mocks/...`（接口调整后用 `make mock` 重新生成）。
- 覆盖率需覆盖 handler/service/repository（`make test` 已携带 `-coverpkg`）。
- 测试默认指向 `config/local.yml`（或用 `APP_CONF` 覆盖），避免修改 `storage/` 中共享的样例文件。

## 提交与 PR 规范
- 提交信息用简洁祈使句（如 `Add user pagination`）；相关改动尽量合并在同一提交。
- PR 需说明意图、关键改动与测试结果（`make test` 输出或手工步骤）。涉及 `web/` 的改动请附截图并关联 issue（如有）。
- 确保生成物最新（`make swag`、重新生成的 mocks），避免提交本地构建产物或私有配置覆盖。

## 安全与配置提示
- 不要提交真实密钥或数据库 DSN；敏感覆盖放在私有 `APP_CONF` 路径，勿改 `config/prod.yml`。
- `storage/` 下的 SQLite 与日志随环境而异—必要时清理或在 gitignore 中忽略。
- 为新增依赖评估许可证与体积影响后再写入 `go.mod`。

## 备注
- 本项目后续新增的代码注释以及 AI 回答均使用简体中文。
