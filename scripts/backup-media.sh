#!/bin/bash
# 媒体文件备份脚本
# 使用方式：./scripts/backup-media.sh

set -e

# 配置
SOURCE_DIR="${MEDIA_DIR:-./uploads}"
BACKUP_DIR="${BACKUP_DIR:-/backups/media}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d)
BACKUP_FILE="$BACKUP_DIR/media_$TIMESTAMP.tar.gz"

# 检查源目录
if [ ! -d "$SOURCE_DIR" ]; then
  echo "⚠️  媒体目录不存在: $SOURCE_DIR，跳过备份"
  exit 0
fi

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "📁 开始媒体文件备份..."
echo "源目录: $SOURCE_DIR"
echo "目标文件: $BACKUP_FILE"

# 执行备份（排除临时文件）
tar -czf "$BACKUP_FILE" \
  --exclude='*.tmp' \
  --exclude='temp/*' \
  --exclude='.DS_Store' \
  -C "$(dirname "$SOURCE_DIR")" \
  "$(basename "$SOURCE_DIR")"

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
find "$BACKUP_DIR" -name "media_*.tar.gz" -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "media_*.tar.gz.sha256" -mtime "+$RETENTION_DAYS" -delete

REMAINING=$(find "$BACKUP_DIR" -name "media_*.tar.gz" | wc -l)
echo "📦 当前保留 $REMAINING 个备份文件"
echo "✨ 媒体备份流程完成"
