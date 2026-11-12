'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

export default function ChildrenPage() {
  const { token } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    apiFetch('/school/me', { token })
      .then((data) => setChildren(Array.isArray(data?.children) ? data.children : []))
      .catch((err) => setError(err.message || 'Could not load your children'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Your children</h1>
      <p className="mb-6 text-sm text-gray-500">
        A nursery child has a pupil record and cannot sign in. Open that record to see their school, class, and teacher.
      </p>
      {error && <p className="mb-4 text-sm text-red-700" role="alert">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : children.length === 0 ? (
        <p className="text-sm text-gray-500">No children are linked to this account.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Link key={child.studentId} href={`/portal/children/${child.studentId}`} className="rounded-xl border border-gray-200 bg-white p-5 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{child.firstName} {child.lastName}</p>
              <p className="mt-1 text-sm text-gray-500">{child.school?.name || 'No school'} · {child.class?.name || 'No class'}</p>
              <p className="mt-3 text-sm font-medium text-brand-700">
                {child.canLogin ? 'Can sign in' : 'Cannot sign in · view record'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
