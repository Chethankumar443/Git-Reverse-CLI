// ─────────────────────────────────────────────────────────────
//  git-reverse — At-rest secret encryption
//
//  Encrypts the OpenRouter API key and GitHub token before they are written to
//  the local `conf` JSON store, satisfying the blueprint's "encrypted or
//  cleartext" requirement (TRD §2.1 / NFR) without pulling in a native
//  keychain dependency (e.g. keytar) that would complicate the single-file
//  tsup bundle and cross-platform installs.
//
//  ── Threat model & honest caveat ──────────────────────────────
//  The key is derived (scrypt) from a machine fingerprint: hostname + OS
//  username + a fixed app salt. This protects against a casual copy of the
//  config *file* off the disk, but a determined local attacker with code
//  execution on the same machine can reconstruct the key. This is at-rest
//  obfuscation, NOT a hardware-backed secret store. Do not treat a stored
//  secret as safe to leak.
//
//  ── Format ─────────────────────────────────────────────────────
//  Encrypted values are stored as:
//      v1:<ivHex>:<authTagHex>:<ciphertextHex>
//  Legacy plaintext values (no `v1:` prefix) are passed through unchanged by
//  decryptSecret, and re-encrypted on next write.
// ─────────────────────────────────────────────────────────────

import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { hostname, userInfo } from 'node:os';

const ENVELOPE_PREFIX = 'v1:';
const KEY_LEN = 32; // AES-256
const IV_LEN = 12; // 96-bit IV (recommended for GCM)
const SCRYPT_PARAMS = { N: 1 << 14, r: 8, p: 1 }; // ~cost of ~25ms; one-shot on read/write
// Fixed application salt. Combined with the machine fingerprint below. Kept
// constant so the same machine always derives the same key across runs.
const APP_SALT = 'git-reverse/v1/secret-store-salt';

function machineFingerprint(): string {
  // Stable, OS-available signals. userInfo().username can throw in some
  // sandboxed environments — fall back to the USERNAME/USER env vars.
  let user = '';
  try {
    user = userInfo().username || '';
  } catch {
    user = process.env.USERNAME || process.env.USER || '';
  }
  return `${hostname()}::${user}`;
}

function deriveKey(): Buffer {
  return scryptSync(machineFingerprint(), APP_SALT, KEY_LEN, SCRYPT_PARAMS);
}

/** Returns true when the value looks like an encrypted envelope. */
export function isEncrypted(value: string | undefined | null): boolean {
  return !!value && value.startsWith(ENVELOPE_PREFIX);
}

/**
 * Encrypt a plaintext secret into the `v1:` envelope. Empty input returns ''
 * so we never store a nonsense envelope for an unset field.
 */
export function encryptSecret(plain: string): string {
  if (!plain) return '';
  if (isEncrypted(plain)) return plain; // don't double-encrypt

  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENVELOPE_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypt a `v1:` envelope. Values without the prefix are treated as legacy
 * plaintext and returned unchanged (see module docs). Returns '' for empty
 * input. Throws on tamper / wrong key (auth tag mismatch) — callers should
 * catch and treat the secret as unset.
 */
export function decryptSecret(stored: string | undefined | null): string {
  if (!stored) return '';
  if (!isEncrypted(stored)) return stored; // legacy plaintext passthrough

  const parts = stored.slice(ENVELOPE_PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed secret envelope (expected v1:<iv>:<tag>:<ct>)');
  }
  const [ivHex, authTagHex, ctHex] = parts;

  let iv: Buffer, authTag: Buffer, ciphertext: Buffer;
  try {
    iv = Buffer.from(ivHex, 'hex');
    authTag = Buffer.from(authTagHex, 'hex');
    ciphertext = Buffer.from(ctHex, 'hex');
  } catch {
    throw new Error('Malformed secret envelope (bad hex encoding)');
  }

  const decipher = createDecipheriv('aes-256-gcm', deriveKey(), iv);
  decipher.setAuthTag(authTag);
  // setAuthTag + decipher.final() throws if the tag does not verify (tamper /
  // wrong key). Let it propagate.
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}

/**
 * Convenience: decrypt, tolerating any failure by returning ''. Use this when
 * a corrupt/tampered value should be treated as "no secret set" rather than
 * throwing (e.g. when reading config at startup).
 */
export function decryptSecretSafe(stored: string | undefined | null): string {
  try {
    return decryptSecret(stored);
  } catch {
    return '';
  }
}
