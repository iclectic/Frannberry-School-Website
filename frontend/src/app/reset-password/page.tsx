'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import { apiFetch } from '@/lib/api';

function ResetForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [token, setToken] = useState(params.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, token, newPassword }),
      });
      setMessage(data.message || 'Password reset. You can sign in.');
    } catch (err: any) {
      setError(err.message || 'Could not reset the password');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="card mt-6 space-y-4">
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}
      <label className="label-text" htmlFor="email">Email</label>
      <input id="email" type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label className="label-text" htmlFor="token">Reset token</label>
      <input id="token" required className="input-field" value={token} onChange={(e) => setToken(e.target.value)} />
      <label className="label-text" htmlFor="password">New password</label>
      <input id="password" type="password" required minLength={8} className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      <button className="btn-primary w-full" disabled={loading}>{loading ? 'Saving…' : 'Set new password'}</button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-gray-900">Choose a new password</h1>
        <p className="mt-2 text-sm text-gray-500">A successful reset clears a sign-in lock and leaves the authenticator secret in place.</p>
        <Suspense fallback={<p className="mt-6 text-sm text-gray-500">Loading…</p>}>
          <ResetForm />
        </Suspense>
        <p className="mt-4 text-center text-sm"><Link href="/login" className="text-brand-700">Back to sign in</Link></p>
      </div>
    </>
  );
}
