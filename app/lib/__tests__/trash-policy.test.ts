import { describe, it, expect } from 'vitest';
import {
  isTrashExpired,
  trashExpiryDecision,
  TRASH_RETENTION_DAYS,
} from '../trash-policy';

const DAY = 24 * 60 * 60 * 1000;

describe('trash policy', () => {
  const now = 1_800_000_000_000;

  it('never expires without a deletedAt timestamp', () => {
    expect(isTrashExpired(null, now)).toBe(false);
    expect(isTrashExpired(undefined, now)).toBe(false);
    expect(trashExpiryDecision(null, now)).toEqual({
      expired: false,
      ageDays: 0,
      daysLeft: TRASH_RETENTION_DAYS,
    });
  });

  it('treats invalid dates as not expired (defensive)', () => {
    expect(isTrashExpired(new Date('not-a-date'), now)).toBe(false);
    expect(isTrashExpired('garbage', now)).toBe(false);
  });

  it('fresh deletions are not expired', () => {
    expect(isTrashExpired(new Date(now - DAY), now)).toBe(false);
    expect(trashExpiryDecision(new Date(now - DAY), now)).toEqual({
      expired: false,
      ageDays: 1,
      daysLeft: TRASH_RETENTION_DAYS - 1,
    });
  });

  it('expires at exactly the retention boundary', () => {
    expect(
      isTrashExpired(new Date(now - TRASH_RETENTION_DAYS * DAY), now),
    ).toBe(true);
  });

  it('long-past deletions expire with age', () => {
    const decision = trashExpiryDecision(new Date(now - 45 * DAY), now);
    expect(decision).toEqual({ expired: true, ageDays: 45 });
  });

  it('daysLeft floors at zero for old items', () => {
    const decision = trashExpiryDecision(new Date(now - 100 * DAY), now);
    expect(decision).toEqual({ expired: true, ageDays: 100 });
  });

  it('accepts ISO strings as well as Date objects', () => {
    expect(isTrashExpired(new Date(now - 31 * DAY).toISOString(), now)).toBe(true);
    expect(isTrashExpired(new Date(now - 2 * DAY).toISOString(), now)).toBe(false);
  });

  it('supports custom retention windows', () => {
    expect(isTrashExpired(new Date(now - 3 * DAY), now, 7)).toBe(false);
    expect(isTrashExpired(new Date(now - 8 * DAY), now, 7)).toBe(true);
  });
});
