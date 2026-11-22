/**
 * GitHub OAuth 是否可用。
 *
 * Better Auth 在 socialProviders.github 存在但 clientId/clientSecret 为空时
 * 会在初始化阶段报错，导致未配置 GitHub 登录的部署整体不可用。
 * 这里统一判断，供 auth 配置与登录/注册界面复用。
 */
export const isGitHubAuthEnabled = Boolean(
  process.env.GITHUB_CLIENT_ID?.trim() &&
    process.env.GITHUB_CLIENT_SECRET?.trim(),
);
