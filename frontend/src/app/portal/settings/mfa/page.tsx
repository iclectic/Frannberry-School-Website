'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

export default function MfaSettingsPage() {
  const { token } = useAuth();
  const [step, setStep] = useState<'idle' | 'setup' | 'confirm' | 'done'>('idle');
  const [secret, setSecret] = useState('');
  const [otpAuthUrl, setOtpAuthUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      await apiFetch('/auth/mfa/confirm', {
        token: token!,
        method: 'POST',
        body: JSON.stringify({ totpCode }),
      });
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
    } catch (err: any) {
      setError(err.message || 'Failed to disable MFA');
    }
    setLoading(false);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Two-Factor Authentication</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Add an extra layer of security to your account using a TOTP authenticator app like Google Authenticator or Authy.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Idle — enable button */}
      {step === 'idle' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg">🔒</div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">MFA is not enabled</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Protect your account with a TOTP code</p>
            </div>
          </div>
          <button onClick={handleEnable} disabled={loading} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Setting up…' : 'Enable MFA'}
          </button>
        </div>
      )}

      {/* Setup — show secret and QR URI */}
      {step === 'setup' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Step 1: Scan QR Code</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Open your authenticator app and scan the QR code below, or manually enter the secret key.
          </p>

          {/* QR Code via external service */}
          <div className="flex justify-center mb-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`}
              alt="MFA QR Code"
              className="rounded-lg border dark:border-gray-700"
              width={200}
              height={200}
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-6">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Secret Key (manual entry)</p>
            <code className="text-sm font-mono text-gray-900 dark:text-gray-100 select-all break-all">{secret}</code>
          </div>

          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Step 2: Verify Code</h2>
          <form onSubmit={handleConfirm} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Enter 6-digit code from your app</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="mt-1 w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2.5 text-center text-lg tracking-widest font-mono"
                required
              />
            </div>
            <button type="submit" disabled={loading || totpCode.length !== 6} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Verifying…' : 'Verify & Enable'}
            </button>
          </form>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-lg">✅</div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">MFA is enabled</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Your account is protected with two-factor authentication</p>
            </div>
          </div>
          <button onClick={handleDisable} disabled={loading} className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {loading ? 'Disabling…' : 'Disable MFA'}
          </button>
        </div>
      )}
    </div>
  );
}
