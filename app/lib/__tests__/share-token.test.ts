import { describe, it, expect } from 'vitest';
import {
  generateShareToken,
  isValidShareToken,
  hashSharePassword,
  verifySharePassword,
  isShareExpired,
  isShareRevoked,
  isShareUsable,
  canDownload,
} from '@/app/lib/share-token';

describe('share token', () => {
  it('generates high-entropy, well-formed, unique tokens', () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a).not.toBe(b);
    expect(a).toHaveLength(32);
    expect(isValidShareToken(a)).toBe(true);
    expect(isValidShareToken('short')).toBe(false);
    expect(isValidShareToken('a'.repeat(32) + '!')).toBe(false);
    expect(isValidShareToken(123)).toBe(false);
  });
});

describe('share password hashing', () => {
  it('verifies the correct password and rejects wrong ones', () => {
    const hash = hashSharePassword('correct horse');
    expect(verifySharePassword('correct horse', hash)).toBe(true);
    expect(verifySharePassword('wrong', hash)).toBe(false);
    expect(hash).toMatch(/^scrypt\$/);
  });

  it('uses a random salt so identical passwords produce different hashes', () => {
    expect(hashSharePassword('same')).not.toBe(hashSharePassword('same'));
  });

  it('fails closed on malformed / missing hashes', () => {
    expect(verifySharePassword('x', null)).toBe(false);
    expect(verifySharePassword('x', undefined)).toBe(false);
    expect(verifySharePassword('x', 'garbage')).toBe(false);
    expect(verifySharePassword('', hashSharePassword('x'))).toBe(false);
  });
});

describe('share expiry / revocation', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  it('treats null expiry as never expiring', () => {
    expect(isShareExpired(null, now)).toBe(false);
    expect(isShareExpired(undefined, now)).toBe(false);
  });

  it('expires at or before the boundary', () => {
    expect(isShareExpired(new Date('2025-12-31T23:59:59Z'), now)).toBe(true);
    expect(isShareExpired(new Date('2026-01-01T00:00:00Z'), now)).toBe(true);
    expect(isShareExpired(new Date('2026-01-02T00:00:00Z'), now)).toBe(false);
  });

  it('combines expiry + revocation into usability', () => {
    expect(isShareUsable({ expiresAt: null, revokedAt: null }, now)).toBe(true);
    expect(isShareUsable({ expiresAt: new Date('2020-01-01'), revokedAt: null }, now)).toBe(false);
    expect(isShareUsable({ expiresAt: null, revokedAt: new Date('2025-01-01') }, now)).toBe(false);
    expect(isShareRevoked(new Date())).toBe(true);
    expect(isShareRevoked(null)).toBe(false);
  });
});

describe('share role permissions', () => {
  it('lets editors always download', () => {
    expect(canDownload('editor', false)).toBe(true);
    expect(canDownload('editor', undefined)).toBe(true);
  });

  it('gates viewer download on the allowDownload flag only', () => {
    expect(canDownload('viewer', true)).toBe(true);
    expect(canDownload('viewer', false)).toBe(false);
    expect(canDownload('viewer', undefined)).toBe(false);
  });
});
