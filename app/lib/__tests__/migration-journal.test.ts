import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type Journal = { entries: Array<{ idx: number; when: number; tag: string }> };

describe('drizzle migration journal', () => {
  it('idx 连续且 when 严格递增（drizzle 按时间戳判断是否执行）', () => {
    const journal = JSON.parse(
      readFileSync(join(process.cwd(), 'drizzle/meta/_journal.json'), 'utf8'),
    ) as Journal;

    journal.entries.forEach((entry, i) => {
      expect(entry.idx).toBe(i);
      if (i > 0) {
        expect(entry.when).toBeGreaterThan(journal.entries[i - 1].when);
      }
    });
  });
});
