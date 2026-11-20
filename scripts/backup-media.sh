#!/bin/bash
# 媒体文件备份脚本（P2-8 修复版）
#
# 修复的问题：旧版只备 ./uploads，漏掉 NAS 真实媒体（/volume1~3）。
# 现在支持多来源：MEDIA_SOURCES 环境变量（空格分隔）；未提供时自动探测
# 容器内挂载（/media/photos、/nas/volume1~3）与应用 uploads 目录。
#
# 使用方式：
#   ./scripts/backup-media.sh
#   MEDIA_SOURCES="/media/photos /nas/volume1" ./scripts/backup-media.sh
#   MEDIA_DIR=./uploads BACKUP_DIR=/backups/media ./scripts/backup-media.sh
#
# 恢复方式（对应单个备份包）：
#   sha256sum -c /backups/media/<名>_YYYYMMDD.tar.gz.sha256
#   tar -xzf /backups/media/<名>_YYYYMMDD.tar.gz -C <源目录的父目录>

set -e

BACKUP_DIR="${BACKUP_DIR:-/backups/media}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d)
LOG_PREFIX="[media-backup]"

log() { echo "$LOG_PREFIX $(date '+%F %T') $*"; }

# ---- 解析来源列表 ----
if [ -n "$MEDIA_SOURCES" ]; then
  SOURCES="$MEDIA_SOURCES"
else
  log "未指定 MEDIA_SOURCES，自动探测容器内媒体挂载..."
  SOURCES=""
  for candidate in /media/photos /nas/volume1 /nas/volume2 /nas/volume3 /app/uploads; do
    if [ -d "$candidate" ]; then
      SOURCES="$SOURCES $candidate"
    fi
  done
  # 兼容旧用法：宿主机脚本场景下的 ./uploads
  if [ -z "$SOURCES" ] && [ -d "${MEDIA_DIR:-./uploads}" ]; then
    SOURCES="${MEDIA_DIR:-./uploads}"
  fi
fi

if [ -z "$SOURCES" ]; then
  log "⚠️  未找到任何媒体目录（检查 MEDIA_SOURCES 或挂载），跳过备份"
  exit 0
fi

mkdir -p "$BACKUP_DIR"
FAILED=0

for SOURCE_DIR in $SOURCES; do
  # 来源名：取路径最后一段（photos / volume1 / uploads ...）
  SOURCE_NAME=$(basename "$SOURCE_DIR")
  BACKUP_FILE="$BACKUP_DIR/${SOURCE_NAME}_$TIMESTAMP.tar.gz"

  if [ ! -d "$SOURCE_DIR" ]; then
    log "⚠️  目录不存在，跳过: $SOURCE_DIR"
    continue
  fi

  log "📦 备份 $SOURCE_DIR -> $BACKUP_FILE"

  # 备份（排除临时文件）；用源目录的父目录作为 tar 基准，保证恢复时还原目录名
  if ! tar -czf "$BACKUP_FILE" \
    --exclude='*.tmp' \
    --exclude='temp/*' \
    --exclude='.DS_Store' \
    --exclude='.memorix' \
    -C "$(dirname "$SOURCE_DIR")" \
    "$(basename "$SOURCE_DIR")"; then
    log "❌ tar 失败: $SOURCE_DIR"
    FAILED=1
    continue
  fi

  if [ ! -s "$BACKUP_FILE" ]; then
    log "❌ 备份文件为空: $BACKUP_FILE"
    FAILED=1
    continue
  fi

  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  log "✅ 完成: $BACKUP_FILE ($SIZE)"

  # SHA256 校验和
  CHECKSUM=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)
  echo "$CHECKSUM  $BACKUP_FILE" > "$BACKUP_FILE.sha256"

  # 恢复自检：验证包可读且条目数 > 0（防「备份成功」实际是空包）
  ENTRY_COUNT=$(tar -tzf "$BACKUP_FILE" 2>/dev/null | wc -l)
  if [ "$ENTRY_COUNT" -le 0 ]; then
    log "❌ 备份包自检失败（0 个条目）: $BACKUP_FILE"
    FAILED=1
    continue
  fi
  log "🔍 自检通过: $ENTRY_COUNT 个条目，校验和 $CHECKSUM"
done

# ---- 清理旧备份 ----
log "🧹 清理 $RETENTION_DAYS 天前的旧备份..."
find "$BACKUP_DIR" -name "*_*.tar.gz" ! -name "*_$TIMESTAMP.tar.gz" -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "*_*.tar.gz.sha256" -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true

REMAINING=$(find "$BACKUP_DIR" -name "*_*.tar.gz" ! -name "*_$TIMESTAMP.tar.gz" | wc -l)
TODAY_COUNT=$(find "$BACKUP_DIR" -name "*_$TIMESTAMP.tar.gz" | wc -l)
log "📦 保留：今日 $TODAY_COUNT 个 + 历史 $REMAINING 个"

if [ "$FAILED" -ne 0 ]; then
  log "⚠️  部分来源备份失败，请检查上方日志"
  exit 1
fi

log "✨ 媒体备份流程完成"
