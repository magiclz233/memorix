/**
 * 从 Better Auth session 中取数据库用户 ID。
 *
 * Better Auth 配置了 `advanced.database.useNumberId: true`，session.user.id
 * 即 users.id；类型上仍是 string，需要安全转换。取不到或非法时返回 null，
 * 让调用方走「未登录 / 用户不存在」分支。
 */
type SessionLike =
  | {
      user?: {
        id?: unknown;
      } | null;
    }
  | null
  | undefined;

export function getSessionUserId(session: SessionLike): number | null {
  const raw = session?.user?.id;
  if (typeof raw !== 'number' && typeof raw !== 'string') return null;

  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
