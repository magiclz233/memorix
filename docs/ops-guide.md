# Lumina Pro 运维指南

## 目录

- [部署清单](#部署清单)
- [Cron 定时任务](#cron-定时任务)
- [备份与恢复](#备份与恢复)
- [监控与告警](#监控与告警)
- [回滚步骤](#回滚步骤)
- [常见问题](#常见问题)

---

## 部署清单

### 部署前检查

- [ ] 所有测试通过（`pnpm test:unit --run`）
- [ ] TypeScript 类型检查通过（`pnpm tsc --noEmit`）
- [ ] ESLint 无错误（`pnpm lint`）
- [ ] 代码已合并到 main 分支
- [ ] 数据库迁移脚本已准备（`pnpm drizzle-kit generate`）
- [ ] 环境变量已配置（参考 `.env.example`）
- [ ] 数据库备份已完成
- [ ] 监控系统正常运行

### 部署步骤

1. 触发 GitHub Actions 部署流水线（推送到 main 分支）
2. 等待 Docker 镜像构建完成
3. 在 GitHub Actions 中审批生产环境部署
4. 等待健康检查通过
5. 验证关键功能（登录、上传、画廊）
6. 检查监控仪表盘（`/dashboard/monitoring`）

### 手动部署

```bash
# 在服务器上执行
cd /opt/lumina
docker-compose pull
docker-compose up -d --no-deps app
docker-compose exec app pnpm db:migrate
```

---

## Cron 定时任务

在服务器上配置以下 crontab（`crontab -e`）：

```bash
# 每天凌晨 2 点备份数据库
0 2 * * * /opt/lumina/scripts/backup-database.sh >> /var/log/lumina/backup-db.log 2>&1

# 每周日凌晨 3 点备份媒体文件
0 3 * * 0 /opt/lumina/scripts/backup-media.sh >> /var/log/lumina/backup-media.log 2>&1

# 每小时检查告警规则
0 * * * * cd /opt/lumina && docker-compose exec -T app node -e "require('./dist/lib/alerting').AlertManager.checkRules()" >> /var/log/lumina/alerts.log 2>&1
```

---

## 备份与恢复

### 数据库备份

```bash
# 手动执行备份
DATABASE_URL="postgresql://..." ./scripts/backup-database.sh

# 备份文件位置
ls -la /backups/database/
```

### 数据库恢复

```bash
# 恢复到指定备份
DATABASE_URL="postgresql://..." ./scripts/restore-database.sh /backups/database/lumina_20240101_120000.sql.gz
```

### 媒体文件备份

```bash
# 手动执行备份
MEDIA_DIR="./uploads" ./scripts/backup-media.sh

# 备份文件位置
ls -la /backups/media/
```

---

## 监控与告警

### 健康检查

```bash
# 检查服务状态
curl http://localhost:3000/api/health

# 预期响应
{
  "status": "healthy",
  "checks": {
    "database": { "status": "up", "latency": 5 },
    "redis": { "status": "up", "latency": 1 },
    "storage": { "status": "up", "available": true }
  }
}
```

### 监控仪表盘

访问 `/dashboard/monitoring`（需要管理员权限）查看：
- Web Vitals 指标（LCP/FID/CLS/FCP/TTFB）
- 错误统计（24 小时）
- 最近错误日志

### 日志查看

```bash
# 查看应用日志
docker-compose logs -f app

# 查看最近 100 行
docker-compose logs --tail=100 app

# 通过 API 查询日志（需要管理员 Token）
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/admin/logs?level=error&limit=20"
```

---

## 回滚步骤

### 快速回滚（Docker）

```bash
cd /opt/lumina

# 查看可用镜像
docker images | grep lumina

# 回滚到上一个版本
docker-compose down
docker tag ghcr.io/your-org/lumina:previous ghcr.io/your-org/lumina:latest
docker-compose up -d

# 如需回滚数据库，使用备份恢复脚本
./scripts/restore-database.sh /backups/database/lumina_<timestamp>.sql.gz
```

### 验证回滚

1. 检查健康端点：`curl http://localhost:3000/api/health`
2. 验证登录功能
3. 验证画廊加载
4. 检查监控仪表盘

---

## 常见问题

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
docker-compose ps postgres
docker-compose logs postgres

# 测试连接
docker-compose exec postgres psql -U postgres -d lumina -c "SELECT 1"
```

### Redis 连接失败

```bash
# 检查 Redis 状态
docker-compose ps redis
docker-compose exec redis redis-cli ping
```

### 上传失败

1. 检查 `uploads` 目录权限
2. 检查磁盘空间：`df -h`
3. 查看应用日志：`docker-compose logs app | grep upload`

### 性能问题

1. 检查 Web Vitals 仪表盘
2. 查看慢查询日志：`docker-compose logs app | grep "慢查询"`
3. 检查 Redis 缓存命中率：`docker-compose exec redis redis-cli info stats | grep keyspace`

---

## 紧急联系人

| 角色 | 姓名 | 联系方式 |
|------|------|----------|
| 技术负责人 | [姓名] | [联系方式] |
| 运维负责人 | [姓名] | [联系方式] |
| 数据库管理员 | [姓名] | [联系方式] |
