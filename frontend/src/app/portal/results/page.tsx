'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

export default function PortalResultsPage() {
  const { user, token } = useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !user) return;

    let endpoint = '/results';
    if (user.role === 'STUDENT') {
      endpoint = '/results/my';
    } else if (user.role === 'PARENT') {
      endpoint = '/results/children';
    }

    apiFetch(endpoint, { token })
      .then((data) => setResults(Array.isArray(data) ? data : []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [token, user]);

  const gradeColor = (grade: string) => {
    if (grade === 'A' || grade === 'A*') return 'bg-green-50 text-green-700';
    if (grade === 'B') return 'bg-blue-50 text-blue-700';
    if (grade === 'C') return 'bg-amber-50 text-amber-700';
    return 'bg-gray-50 text-gray-700';
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Results</h1>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-gray-500">No results to display.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Subject</th>
                  {(user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'PARENT') && (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Student</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Term</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{r.subject?.name || '—'}</td>
                    {(user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'PARENT') && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {r.student?.user?.firstName} {r.student?.user?.lastName}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{r.score ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {r.grade ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${gradeColor(r.grade)}`}>{r.grade}</span>
                      ) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{r.term?.name || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{r.remark || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
