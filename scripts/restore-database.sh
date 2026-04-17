#!/bin/bash
# 数据库恢复脚本
# 使用方式：./scripts/restore-database.sh <backup_file>

set -e

if [ -z "$1" ]; then
  echo "使用方式: $0 <backup_file>"
  echo "示例: $0 /backups/database/lumina_20240101_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
CHECKSUM_FILE="$BACKUP_FILE.sha256"

# 验证备份文件存在
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ 备份文件不存在: $BACKUP_FILE"
  exit 1
fi

# 验证校验和
if [ -f "$CHECKSUM_FILE" ]; then
  echo "🔍 验证备份文件完整性..."
  EXPECTED=$(cat "$CHECKSUM_FILE")
  ACTUAL=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)

  if [ "$EXPECTED" != "$ACTUAL" ]; then
    echo "❌ 校验和不匹配！备份文件可能已损坏。"
    echo "期望: $EXPECTED"
    echo "实际: $ACTUAL"
    exit 1
  fi
  echo "✅ 文件完整性验证通过"
else
  echo "⚠️  未找到校验和文件，跳过完整性验证"
fi

# 确认恢复操作
echo ""
echo "⚠️  警告：此操作将覆盖当前数据库！"
echo "备份文件: $BACKUP_FILE"
echo ""
read -p "确认恢复？输入 'yes' 继续: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "已取消恢复操作"
  exit 0
fi

# 检查数据库连接
DB_URL="${DATABASE_URL:-$POSTGRES_URL}"
if [ -z "$DB_URL" ]; then
  echo "❌ 错误: 未设置 DATABASE_URL 或 POSTGRES_URL 环境变量"
  exit 1
fi

echo "🔄 开始恢复数据库..."
gunzip -c "$BACKUP_FILE" | psql "$DB_URL"

echo "✅ 数据库恢复完成！"
