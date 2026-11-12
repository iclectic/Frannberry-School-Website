import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto';

export const FAILED_SIGN_IN_LIMIT = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;
export const BACKUP_CODE_COUNT = 8;

const BACKUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MFA_KEY_SALT = 'frannberry-mfa-v1';

export const MFA_MANDATORY_ROLES = ['HEAD', 'ADMIN', 'TEACHER'] as const;

export interface SignInLockState {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function normalizeBackupCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

export function hashBackupCode(code: string): string {
  return hashToken(`backup:${normalizeBackupCode(code)}`);
}

export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(8);
    const chars = Array.from(bytes, (byte) => BACKUP_ALPHABET[byte % BACKUP_ALPHABET.length]);
    return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
  });
}

export function encryptionKeyFromSecret(secret: string): Buffer {
  return scryptSync(secret, MFA_KEY_SALT, 32);
}

export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}

export function decryptSecret(payload: string, key: Buffer): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Authenticator secret is not encrypted');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return plain.toString('utf8');
}

export function isAccountLocked(state: Pick<SignInLockState, 'lockedUntil'>, now: Date): boolean {
  return !!state.lockedUntil && state.lockedUntil.getTime() > now.getTime();
}

export function registerFailedSignIn(state: SignInLockState, now: Date): SignInLockState {
  const expired = !!state.lockedUntil && state.lockedUntil.getTime() <= now.getTime();
  const attempts = (expired ? 0 : state.failedLoginAttempts) + 1;
  if (attempts >= FAILED_SIGN_IN_LIMIT) {
    return {
      failedLoginAttempts: attempts,
      lockedUntil: new Date(now.getTime() + LOCKOUT_MS),
    };
  }
  return { failedLoginAttempts: attempts, lockedUntil: null };
}

export function clearSignInLock(): SignInLockState {
  return { failedLoginAttempts: 0, lockedUntil: null };
}

export function mfaIsMandatory(role: string): boolean {
  return (MFA_MANDATORY_ROLES as readonly string[]).includes(role);
}

export function canDisableMfa(role: string): boolean {
  return !mfaIsMandatory(role);
}

export function sessionNeedsMfaSetup(role: string, mfaEnabled: boolean): boolean {
  return mfaIsMandatory(role) && !mfaEnabled;
}
