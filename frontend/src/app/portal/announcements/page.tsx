'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

function AnnouncementList({ items }: { items: any[] }) {
  if (!items.length) return <p className="text-sm text-gray-500">No announcements for this school and key stage.</p>;
  return (
    <div className="space-y-4">
      {items.map((announcement) => (
        <article key={announcement.id} className="card">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{announcement.title}</h2>
            <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{announcement.schoolName ? announcement.scope : 'TRUST'}</span>
          </div>
          {(announcement.schoolName || announcement.keyStage) && (
            <p className="mt-1 text-xs text-gray-500">
              {announcement.schoolName}
              {announcement.keyStage ? ` · ${announcement.keyStage}` : ''}
              {announcement.className ? ` · ${announcement.className}` : ''}
            </p>
          )}
          <p className="mt-3 whitespace-pre-line text-sm text-gray-600">{announcement.content}</p>
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
            <time>{new Date(announcement.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
            {announcement.author && <span>By {announcement.author.firstName} {announcement.author.lastName}</span>}
          </div>
        </article>
      ))}
    </div>
  );
}

function groupTitle(group: any) {
  const place = [group.schoolName, group.keyStage, group.className].filter(Boolean).join(' · ');
  return group.pupilName ? `${group.pupilName} · ${place}` : place;
}

export default function PortalAnnouncementsPage() {
  const { token } = useAuth();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiFetch('/announcements', { token })
      .then(setPayload)
      .catch(() => setPayload(null))
      .finally(() => setLoading(false));
  }, [token]);

  const groups = payload?.groups ?? [];
  const trust = payload?.trust ?? [];
  const flat = payload?.audience === 'all' ? payload.announcements ?? [] : [];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Announcements</h1>
      <p className="mb-6 text-sm text-gray-500">Each list follows the pupil’s school and key stage. A trust-wide notice is shown separately.</p>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : flat.length ? (
        <AnnouncementList items={flat} />
      ) : (
        <div className="space-y-8">
          {trust.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Whole trust</h2>
              <AnnouncementList items={trust} />
            </section>
          )}
          {groups.map((group: any) => (
            <section key={`${group.pupilId ?? group.schoolName}-${group.keyStage}`}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">{groupTitle(group)}</h2>
              <AnnouncementList items={group.announcements || []} />
            </section>
          ))}
          {!trust.length && !groups.length && <p className="text-sm text-gray-500">No announcements to display.</p>}
        </div>
      )}
    </div>
  );
}
