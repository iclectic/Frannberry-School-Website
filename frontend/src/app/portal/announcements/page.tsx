'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

export default function PortalAnnouncementsPage() {
  const { token } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiFetch('/announcements', { token })
      .then((data) => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Announcements</h1>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-gray-500">No announcements to display.</p>
      ) : (
        <div className="space-y-4">
          {announcements.map((a: any) => (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">{a.title}</h2>
                <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{a.scope}</span>
              </div>
              <p className="mt-3 text-sm text-gray-600 whitespace-pre-line">{a.content}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                <time>{new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                {a.author && <span>By {a.author.firstName} {a.author.lastName}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
