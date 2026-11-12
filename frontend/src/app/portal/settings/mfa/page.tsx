'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

const MANDATORY = new Set(['HEAD', 'ADMIN', 'TEACHER']);

export default function MfaSettingsPage() {
  const { token, user, logout } = useAuth();
  const mandatory = MANDATORY.has(user?.role || '');
  const [step, setStep] = useState<'idle' | 'setup' | 'done' | 'enabled'>(user?.mfaSetupRequired ? 'idle' : 'idle');
  const [secret, setSecret] = useState('');
  const [otpAuthUrl, setOtpAuthUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || user?.mfaSetupRequired) return;
    apiFetch('/users/profile', { token })
      .then((profile) => {
        if (profile?.mfaEnabled) setStep('enabled');
      })
      .catch(() => {});
  }, [token, user?.mfaSetupRequired]);

  async function handleEnable() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/auth/mfa/enable', { token: token!, method: 'POST' });
      setSecret(data.secret);
      setOtpAuthUrl(data.otpAuthUrl);
      setStep('setup');
    } catch (err: any) {
      setError(err.message || 'Failed to initiate MFA setup');
    }
    setLoading(false);
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/auth/mfa/confirm', {
        token: token!,
        method: 'POST',
        body: JSON.stringify({ totpCode }),
      });
      setBackupCodes(data.backupCodes || []);
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Invalid TOTP code');
    }
    setLoading(false);
  }

  async function handleDisable() {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) return;
    setLoading(true);
    setError('');
    try {
      await apiFetch('/auth/mfa/disable', { token: token!, method: 'POST' });
      setStep('idle');
      setSecret('');
      setOtpAuthUrl('');
      setBackupCodes([]);
    } catch (err: any) {
      setError(err.message || 'Failed to disable MFA');
    }
    setLoading(false);
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Two-Factor Authentication</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {mandatory
          ? 'Heads, office admins, and teachers must use an authenticator. This session can only set it up or sign out, and MFA cannot be turned off.'
          : 'Parents, pupils, and other staff may turn an authenticator on if they want to.'}
      </p>

      {user?.mfaSetupRequired && step !== 'done' && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Finish authenticator setup before the rest of the portal will open.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {step === 'idle' && (
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <p className="font-medium text-gray-900 dark:text-gray-100">MFA is not confirmed</p>
          <p className="mb-4 text-xs text-gray-500">MFA is marked on only after a valid code. You will then see eight backup codes once.</p>
          <button onClick={handleEnable} disabled={loading} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Setting up…' : 'Set up authenticator'}
          </button>
        </div>
      )}

      {step === 'setup' && (
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 font-semibold text-gray-800 dark:text-gray-200">Step 1: Scan QR Code</h2>
          <div className="mb-4 flex justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`}
              alt="MFA QR Code"
              className="rounded-lg border dark:border-gray-700"
              width={200}
              height={200}
            />
          </div>
          <div className="mb-6 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="mb-1 text-xs font-medium text-gray-500">Secret key (manual entry)</p>
            <code className="break-all font-mono text-sm text-gray-900 dark:text-gray-100">{secret}</code>
          </div>
          <h2 className="mb-3 font-semibold text-gray-800 dark:text-gray-200">Step 2: Verify Code</h2>
          <form onSubmit={handleConfirm} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Enter the 6-digit code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="mt-1 w-full rounded-lg border px-3 py-2.5 text-center font-mono text-lg tracking-widest dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                required
              />
            </div>
            <button type="submit" disabled={loading || totpCode.length !== 6} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Verifying…' : 'Verify & Enable'}
            </button>
          </form>
        </div>
      )}

      {step === 'done' && (
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <p className="font-medium text-gray-900 dark:text-gray-100">Authenticator confirmed</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            These eight backup codes are shown once. Each code works a single time. Sign out and sign in again with a code before using the rest of the portal.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {backupCodes.map((code) => (
              <li key={code} className="rounded bg-gray-50 px-3 py-2 text-center font-mono text-sm dark:bg-gray-800">{code}</li>
            ))}
          </ul>
          <button onClick={logout} className="btn-primary mt-6">Sign out</button>
        </div>
      )}

      {step === 'enabled' && (
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <p className="font-medium text-gray-900 dark:text-gray-100">MFA is on</p>
          {mandatory ? (
            <p className="mt-2 text-sm text-gray-600">Your role cannot turn MFA off.</p>
          ) : (
            <button onClick={handleDisable} disabled={loading} className="mt-4 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Disabling…' : 'Turn MFA off'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
