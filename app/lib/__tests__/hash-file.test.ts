import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { bufferSha256, streamFileSha256 } from '../hash-file';

describe('hash-file', () => {
  it('bufferSha256 matches node crypto for the same bytes', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const expected = createHash('sha256').update(bytes).digest('hex');
    expect(bufferSha256(bytes)).toBe(expected);
    expect(bufferSha256(bytes)).toHaveLength(64);
  });

  it('streamFileSha256 hashes a real file consistently', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'memorix-hash-'));
    const filePath = join(dir, 'sample.bin');
    const payload = Buffer.alloc(1_000_000);
    for (let i = 0; i < payload.length; i++) {
      payload[i] = i % 251;
    }
    await fs.writeFile(filePath, payload);

    const expected = createHash('sha256').update(payload).digest('hex');
    const actual = await streamFileSha256(filePath);
    expect(actual).toBe(expected);

    await fs.rm(dir, { recursive: true, force: true });
  });

  it('streamFileSha256 returns null for missing files', async () => {
    expect(await streamFileSha256('/definitely/not/a/real/file.bin')).toBeNull();
  });
});
