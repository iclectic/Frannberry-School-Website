'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

export default function PortalAssignmentsPage() {
  const { user, token } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiFetch('/assignments', { token })
      .then((data) => setAssignments(Array.isArray(data) ? data : []))
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, [token]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'GRADED': return 'bg-green-50 text-green-700';
      case 'SUBMITTED': return 'bg-blue-50 text-blue-700';
      case 'PUBLISHED': return 'bg-amber-50 text-amber-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Assignments</h1>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-gray-500">No assignments to display.</p>
      ) : (
        <div className="space-y-4">
          {assignments.map((a: any) => (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{a.title}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {a.subject?.name || '—'} &middot; {a.class?.name || '—'}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(a.status)}`}>
                  {a.status}
                </span>
              </div>

              {a.description && (
                <p className="mt-3 text-sm text-gray-600 line-clamp-2">{a.description}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-400">
                {a.dueDate && (
                  <span>Due: {new Date(a.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                )}
                {a.maxScore && <span>Max Score: {a.maxScore}</span>}
                {a.teacher && <span>By {a.teacher.user?.firstName} {a.teacher.user?.lastName}</span>}
              </div>

              {/* Show submissions for students */}
              {user?.role === 'STUDENT' && a.submissions && a.submissions.length > 0 && (
                <div className="mt-4 rounded-lg bg-gray-50 p-3">
                  <h3 className="text-xs font-semibold text-gray-500">Your Submission</h3>
                  {a.submissions.map((sub: any) => (
                    <div key={sub.id} className="mt-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(sub.status)}`}>{sub.status}</span>
                        {sub.score !== null && <span className="text-gray-700">Score: {sub.score}/{a.maxScore}</span>}
                      </div>
                      {sub.feedback && <p className="mt-1 text-xs text-gray-500">{sub.feedback}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
