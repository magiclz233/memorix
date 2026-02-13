# Docker 部署与 NAS 挂载指南

本文档介绍如何使用 Docker Compose 部署 Memorix，并挂载 NAS 中的目录（单盘或多盘）供应用扫描。

## 1. 准备工作

确保你的 NAS 或服务器已安装：
- Docker
- Docker Compose

## 2. 部署步骤

### 2.1 获取代码或配置文件

如果你有代码仓库，直接 clone：
```bash
git clone <repository-url>
cd nextjs-dashboard
```

或者手动创建以下两个文件：
- `docker-compose.yml` (参考根目录)
- `Dockerfile` (参考根目录)

### 2.2 配置 NAS 挂载（核心步骤）

打开 `docker-compose.yml`，找到 `volumes` 部分。

#### 场景 A：挂载单个盘/目录

```yaml
    volumes:
      # 格式: - /宿主机实际路径:/容器内路径
      - /volume1/photos:/app/media/disk1
```

#### 场景 B：挂载多个盘（如 4 盘位 NAS）

如果你的 NAS 有多个独立的存储卷（如 `/volume1`, `/volume2` 等），你需要分别挂载它们到容器内的不同子目录。建议统一挂载到 `/app/media/` 下。

```yaml
    volumes:
      # 盘1：主要存放照片
      - /volume1/photos:/app/media/disk1
      
      # 盘2：主要存放电影
      - /volume2/movies:/app/media/disk2
      
      # 盘3：主要存放下载内容
      - /volume3/downloads:/app/media/disk3
      
      # 盘4：其他数据
      - /volume4/data:/app/media/disk4
```

**配置说明：**
- **宿主机路径**（冒号左侧）：这是你在 NAS 文件管理器中看到的真实路径。
  - 群晖通常是 `/volume1/xxx`, `/volume2/xxx`
  - 威联通通常是 `/share/CACHEDEV1_DATA/xxx`
  - 极空间/绿联通常在 `/mnt/xxx` 或 `/srv/xxx`
- **容器内路径**（冒号右侧）：这是应用在 Docker 容器内部访问的虚拟路径。
  - 建议使用 `/app/media/disk1`, `/app/media/disk2` 这种命名，清晰且方便管理。

### 2.3 配置环境变量

建议创建一个 `.env` 文件在同级目录（不要提交到 Git）：

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=mysecretpassword
POSTGRES_DB=memorix
BETTER_AUTH_SECRET=run_openssl_rand_base64_32_to_generate_this
BETTER_AUTH_URL=http://your-nas-ip:3000
```

### 2.4 启动服务

```bash
docker-compose up -d --build
```

### 2.5 初始化数据库

首次启动后，需要运行数据库迁移：

```bash
# 进入容器执行迁移
docker-compose exec app pnpm drizzle-kit migrate
```

（可选）预置初始数据：
```bash
curl http://localhost:3000/seed
```

## 3. 在后台添加 NAS 存储

1. 访问 `http://your-nas-ip:3000/dashboard/storage` 并登录。
2. 点击 **“添加存储”**。
3. 类型选择 **“本地存储 (Local)”**。
4. **根路径** 填写你在 `docker-compose.yml` 中配置的容器内路径。
   - 如果你想扫描盘1，填写：`/app/media/disk1`
   - 如果你想扫描盘2，填写：`/app/media/disk2`
   - 你可以添加多次，分别对应不同的盘。
5. 填写别名（如 "Disk 1 Photos"），保存。
6. 点击 **“扫描目录”** 开始索引文件。

## 4. 常见问题

- **权限问题**：如果扫描失败或无法读取文件，可能是容器内的 `nextjs` 用户（uid 1001）没有宿主机目录的读取权限。
  - 解决方法：在 NAS 上将对应文件夹的权限赋予 `Everyone` (只读) 或确保 Docker 运行用户有权访问。
- **路径找不到**：请仔细检查 `docker-compose.yml` 中的宿主机路径是否拼写正确，且该路径在 NAS 上真实存在。
