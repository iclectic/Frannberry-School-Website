'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password, mfaCode || undefined);
      if (result?.requiresMfa) {
        setNeedsMfa(true);
        setLoading(false);
        return;
      }
      router.push(result?.user?.mfaSetupRequired ? '/portal/settings/mfa' : '/portal');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-lg font-bold text-white">FS</div>
              <h1 className="text-2xl font-bold text-gray-900">Sign in to your account</h1>
              <p className="mt-1 text-sm text-gray-500">Welcome back to Frannberry School</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="label-text">Email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  className="input-field"
                  placeholder="you@frannberry.school"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="label-text">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  className="input-field"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {needsMfa && (
                <div>
                  <label htmlFor="mfaCode" className="label-text">MFA code or backup code</label>
                  <input
                    id="mfaCode"
                    type="text"
                    required
                    className="input-field"
                    placeholder="123456 or ABCD-EFGH"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.toUpperCase())}
                    autoComplete="one-time-code"
                    maxLength={9}
                  />
                  <p className="mt-1 text-xs text-gray-500">Enter the code from your authenticator app, or one unused backup code</p>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? 'Signing in…' : needsMfa ? 'Verify & Sign In' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 border-t border-gray-200 pt-4">
              <p className="text-center text-xs text-gray-500">
                <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline">Forgot password?</Link>
                {' · '}
                <Link href="/contact" className="font-medium text-brand-600 hover:underline">Contact the school office</Link>
              </p>
            </div>
          </div>

          {/* Demo credentials */}
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-amber-700">Demo Credentials</p>
            <div className="grid gap-1 text-xs text-amber-800">
              <p><strong>Admin:</strong> admin@frannberry.school / Admin123! (authenticator required)</p>
              <p><strong>Head:</strong> helen.green@frannberry.school / Head123!</p>
              <p><strong>Teacher:</strong> j.williams@frannberry.school / Teacher123!</p>
              <p><strong>Pupil:</strong> oliver.smith@frannberry.school / Student123!</p>
              <p><strong>Parent:</strong> david.smith@example.com / Parent123!</p>
              <p><strong>Staff:</strong> r.okonkwo@frannberry.school / Staff123!</p>
              <p>Nursery children, including Poppy Smith, cannot sign in.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
