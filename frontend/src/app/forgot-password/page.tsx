'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { apiFetch } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(data.message || 'If an account exists, a reset link has been sent.');
    } catch (err: any) {
      setError(err.message || 'Could not request a reset');
    }
    setLoading(false);
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
        <p className="mt-2 text-sm text-gray-500">The reset is stored separately from your authenticator secret.</p>
        <form onSubmit={submit} className="card mt-6 space-y-4">
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}
          <label className="label-text" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn-primary w-full" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
        </form>
        <p className="mt-4 text-center text-sm"><Link href="/login" className="text-brand-700">Back to sign in</Link></p>
      </div>
    </>
  );
}
