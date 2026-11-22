import { describe, expect, it } from 'vitest';
import { getSessionUserId } from '../session-user';

describe('getSessionUserId', () => {
  it('接受数字与数字字符串', () => {
    expect(getSessionUserId({ user: { id: 11 } })).toBe(11);
    expect(getSessionUserId({ user: { id: '11' } })).toBe(11);
  });

  it('拒绝缺失、非数字与非法值', () => {
    expect(getSessionUserId(null)).toBeNull();
    expect(getSessionUserId(undefined)).toBeNull();
    expect(getSessionUserId({})).toBeNull();
    expect(getSessionUserId({ user: null })).toBeNull();
    expect(getSessionUserId({ user: { id: 'abc' } })).toBeNull();
    expect(getSessionUserId({ user: { id: 0 } })).toBeNull();
    expect(getSessionUserId({ user: { id: -1 } })).toBeNull();
    expect(getSessionUserId({ user: { id: 1.5 } })).toBeNull();
    expect(getSessionUserId({ user: { id: {} } })).toBeNull();
  });
});
