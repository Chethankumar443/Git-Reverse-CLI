import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, decryptSecretSafe, isEncrypted } from '../crypto.js';

describe('crypto: secret encryption', () => {
  describe('round trip', () => {
    it('encrypts and decrypts an API key back to the original', () => {
      const plain = 'sk-or-v1-abcdef0123456789';
      const enc = encryptSecret(plain);
      expect(enc).not.toBe(plain);
      expect(isEncrypted(enc)).toBe(true);
      expect(decryptSecret(enc)).toBe(plain);
    });

    it('handles a long GitHub token', () => {
      const plain = 'ghp_' + 'A'.repeat(200);
      expect(decryptSecret(encryptSecret(plain))).toBe(plain);
    });

    it('handles unicode and special characters', () => {
      const plain = 'p@ss wörd-🔑/+=';
      expect(decryptSecret(encryptSecret(plain))).toBe(plain);
    });

    it('produces different ciphertexts for the same plaintext (random IV)', () => {
      const plain = 'sk-or-v1-samevalue';
      const a = encryptSecret(plain);
      const b = encryptSecret(plain);
      expect(a).not.toBe(b);
      expect(decryptSecret(a)).toBe(plain);
      expect(decryptSecret(b)).toBe(plain);
    });
  });

  describe('empty / unset handling', () => {
    it('returns empty string for empty plaintext (no envelope stored)', () => {
      expect(encryptSecret('')).toBe('');
    });

    it('decrypts empty input to empty string', () => {
      expect(decryptSecret('')).toBe('');
      expect(decryptSecret(undefined)).toBe('');
      expect(decryptSecret(null)).toBe('');
    });

    it('does not double-encrypt an already-encrypted value', () => {
      const enc = encryptSecret('sk-or-v1-x');
      const reEncrypted = encryptSecret(enc);
      expect(reEncrypted).toBe(enc);
      expect(decryptSecret(reEncrypted)).toBe('sk-or-v1-x');
    });
  });

  describe('legacy plaintext passthrough', () => {
    it('treats a non-prefixed value as plaintext', () => {
      const legacy = 'sk-or-v1-legacy-plaintext';
      expect(isEncrypted(legacy)).toBe(false);
      expect(decryptSecret(legacy)).toBe(legacy);
    });

    it('decryptSecretSafe passes legacy plaintext through', () => {
      expect(decryptSecretSafe('sk-or-v1-legacy')).toBe('sk-or-v1-legacy');
    });
  });

  describe('tamper detection', () => {
    it('throws when the auth tag is corrupted', () => {
      const enc = encryptSecret('sk-or-v1-secret');
      const parts = enc.split(':');
      // Flip a hex char in the auth tag (3rd segment).
      const flipped = parts[2][0] === '0' ? 'f' : '0';
      parts[2] = flipped + parts[2].slice(1);
      const tampered = parts.join(':');
      expect(() => decryptSecret(tampered)).toThrow();
    });

    it('throws when the ciphertext is altered', () => {
      const enc = encryptSecret('sk-or-v1-secret');
      const parts = enc.split(':');
      const flipped = parts[3][0] === '0' ? 'f' : '0';
      parts[3] = flipped + parts[3].slice(1);
      const tampered = parts.join(':');
      expect(() => decryptSecret(tampered)).toThrow();
    });

    it('throws on a malformed envelope (wrong segment count)', () => {
      expect(() => decryptSecret('v1:deadbeef')).toThrow(/Malformed/);
    });

    it('decryptSecretSafe swallows tamper errors and returns empty', () => {
      const enc = encryptSecret('sk-or-v1-secret');
      const tampered = enc.slice(0, -2) + '00'; // corrupt trailing ciphertext hex
      expect(decryptSecretSafe(tampered)).toBe('');
    });
  });
});
