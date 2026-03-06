import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // bytes
const AUTH_TAG_LENGTH = 16; // bytes

class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new EncryptionError('ENCRYPTION_KEY is not configured');
  }

  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new EncryptionError('ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
  }
  return key;
}

export function encryptValue(plaintext: string): string {
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    const payload = Buffer.concat([iv, authTag, ciphertext]);
    return payload.toString('base64');
  } catch (err) {
    throw new EncryptionError(
      err instanceof Error ? err.message : 'Failed to encrypt value',
    );
  }
}

export function decryptValue(encrypted: string): string {
  try {
    const key = getKey();
    const payload = Buffer.from(encrypted, 'base64');

    if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      throw new DecryptionError('Encrypted payload is too short');
    }

    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    if (err instanceof DecryptionError) {
      throw err;
    }
    throw new DecryptionError(
      err instanceof Error ? err.message : 'Failed to decrypt value',
    );
  }
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function maskValue(value: string): string {
  if (!value) return '••••';
  const visible = value.slice(-4);
  return `••••••••${visible}`;
}

export { EncryptionError, DecryptionError };

