import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  BACKUP_CODE_COUNT,
  LOCKOUT_MS,
  canDisableMfa,
  clearSignInLock,
  decryptSecret,
  encryptSecret,
  encryptionKeyFromSecret,
  generateBackupCodes,
  hashBackupCode,
  hashToken,
  isAccountLocked,
  mfaIsMandatory,
  registerFailedSignIn,
  sessionNeedsMfaSetup,
} from './account-security';

const key = encryptionKeyFromSecret('test-mfa-key');

test('refresh tokens and backup codes are stored as hashes', () => {
  const refresh = 'raw-refresh-token';
  const hashed = hashToken(refresh);
  assert.notEqual(hashed, refresh);
  assert.equal(hashed, hashToken(refresh));
  assert.equal(hashed.length, 64);

  const [code] = generateBackupCodes(1);
  const codeHash = hashBackupCode(code);
  assert.notEqual(codeHash, code);
  assert.equal(codeHash, hashBackupCode(code.toLowerCase()));
  assert.equal(codeHash, hashBackupCode(code.replace('-', ' ')));
});

test('confirming MFA produces eight single-use backup codes', () => {
  const codes = generateBackupCodes();
  assert.equal(codes.length, BACKUP_CODE_COUNT);
  assert.equal(new Set(codes).size, BACKUP_CODE_COUNT);
  for (const code of codes) {
    assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  }
});

test('the authenticator secret is encrypted and can be decrypted only with the same key', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const stored = encryptSecret(secret, key);
  assert.equal(stored.includes(secret), false);
  assert.equal(decryptSecret(stored, key), secret);
  assert.throws(() => decryptSecret(stored, encryptionKeyFromSecret('other-key')));
  const [iv, tag, data] = stored.split('.');
  assert.throws(() => decryptSecret(`${iv}.${tag}.${data.slice(0, -2)}aa`, key));
});

test('five failed sign-ins lock the account for 15 minutes', () => {
  const now = new Date('2026-11-12T09:00:00.000Z');
  let state = { failedLoginAttempts: 0, lockedUntil: null as Date | null };
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    state = registerFailedSignIn(state, now);
    assert.equal(state.failedLoginAttempts, attempt);
    assert.equal(state.lockedUntil, null);
    assert.equal(isAccountLocked(state, now), false);
  }
  state = registerFailedSignIn(state, now);
  assert.equal(state.failedLoginAttempts, 5);
  assert.ok(state.lockedUntil);
  assert.equal(state.lockedUntil.toISOString(), new Date(now.getTime() + LOCKOUT_MS).toISOString());
  assert.equal(isAccountLocked(state, new Date(now.getTime() + LOCKOUT_MS - 1)), true);
  assert.equal(isAccountLocked(state, new Date(now.getTime() + LOCKOUT_MS)), false);
});

test('a failure after the lock expires starts again, and a reset clears the lock', () => {
  const now = new Date('2026-11-12T09:00:00.000Z');
  const locked = registerFailedSignIn(
    { failedLoginAttempts: 4, lockedUntil: null },
    now,
  );
  const after = new Date(locked.lockedUntil!.getTime() + 1);
  const next = registerFailedSignIn(locked, after);
  assert.equal(next.failedLoginAttempts, 1);
  assert.equal(next.lockedUntil, null);
  assert.deepEqual(clearSignInLock(), { failedLoginAttempts: 0, lockedUntil: null });
});

test('HEAD, ADMIN, and TEACHER must set up MFA and cannot turn it off', () => {
  for (const role of ['HEAD', 'ADMIN', 'TEACHER']) {
    assert.equal(mfaIsMandatory(role), true);
    assert.equal(canDisableMfa(role), false);
    assert.equal(sessionNeedsMfaSetup(role, false), true);
    assert.equal(sessionNeedsMfaSetup(role, true), false);
  }
});

test('parents, pupils, and other staff may turn MFA on if they want to', () => {
  for (const role of ['PARENT', 'STUDENT', 'STAFF']) {
    assert.equal(mfaIsMandatory(role), false);
    assert.equal(canDisableMfa(role), true);
    assert.equal(sessionNeedsMfaSetup(role, false), false);
    assert.equal(sessionNeedsMfaSetup(role, true), false);
  }
});
