#!/bin/bash
# 数据库备份脚本
# 使用方式：./scripts/backup-database.sh

set -e

# 配置
BACKUP_DIR="${BACKUP_DIR:-/backups/database}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lumina_$TIMESTAMP.sql.gz"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "🗄️  开始数据库备份..."
echo "目标文件: $BACKUP_FILE"

# 执行备份
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
  echo "❌ 错误: 未设置 DATABASE_URL 或 POSTGRES_URL 环境变量"
  exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

pg_dump "$DB_URL" | gzip > "$BACKUP_FILE"

# 验证备份文件
if [ ! -f "$BACKUP_FILE" ] || [ ! -s "$BACKUP_FILE" ]; then
  echo "❌ 备份失败：文件不存在或为空"
  exit 1
fi

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ 备份完成: $BACKUP_FILE ($SIZE)"

# 生成 SHA256 校验和
CHECKSUM=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)
echo "$CHECKSUM" > "$BACKUP_FILE.sha256"
echo "📝 校验和: $CHECKSUM"

# 清理旧备份
echo "🧹 清理 $RETENTION_DAYS 天前的旧备份..."
find "$BACKUP_DIR" -name "lumina_*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "lumina_*.sql.gz.sha256" -mtime "+$RETENTION_DAYS" -delete

REMAINING=$(find "$BACKUP_DIR" -name "lumina_*.sql.gz" | wc -l)
echo "📦 当前保留 $REMAINING 个备份文件"
echo "✨ 备份流程完成"
