// 注意：`next/font/google` 会在构建期从 Google Fonts 拉取资源；在无外网/被墙环境会导致 `next build` 失败。
// 这里先使用系统字体栈，避免构建依赖外部网络；如需保持原字体效果，可改为 `next/font/local` 并把字体文件放入仓库。
export const inter = { className: 'font-sans' } as const;
export const lusitana = { className: 'font-serif' } as const;
