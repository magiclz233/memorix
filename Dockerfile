# syntax=docker/dockerfile:1

# ============ 阶段 1：安装依赖 ============
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 国内网络下 npm 官方源很慢；构建期默认使用镜像源，包完整性仍由 lockfile 校验。
# 海外构建可传入 --build-arg NPM_REGISTRY=https://registry.npmjs.org 覆盖。
ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV npm_config_registry=$NPM_REGISTRY
ENV npm_config_fetch_retries=5

# 安装 pnpm（固定 9.x：pnpm 12 起不再读 package.json 的 pnpm.overrides，会与 lockfile 冲突）
RUN npm install -g pnpm@9.15.4

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
# --ignore-scripts：跳过 ffmpeg-static / ffprobe-static 的 GitHub 二进制下载
# （运行镜像用系统 ffmpeg 代替）；sharp 的预编译包由 pnpm 按平台自动安装，无需安装脚本
# pnpm store 使用 BuildKit 持久化缓存，后续构建可复用已下载的包。
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

# ============ 阶段 2：构建应用 ============
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN npm install -g pnpm@9.15.4

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建配置
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建应用
RUN pnpm build

# ============ 阶段 3：运行时（默认构建目标，必须放在最后） ============
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 系统 ffmpeg：alpine 是 musl，ffmpeg-static 的 glibc 二进制跑不起来，用 apk 装
RUN apk add --no-cache ffmpeg libstdc++ libc6-compat
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public

# 设置 standalone 输出目录权限
RUN mkdir .next
RUN chown nextjs:nodejs .next

# 复制 standalone 构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 创建上传 / 日志 / 缩略图缓存目录
RUN mkdir -p /app/uploads /app/logs /app/.cache && chown nextjs:nodejs /app/uploads /app/logs /app/.cache

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
