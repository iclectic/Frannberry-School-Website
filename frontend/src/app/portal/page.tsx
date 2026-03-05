'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function AnnouncementCard({ announcement }: { announcement: any }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{announcement.scope}</span>
      </div>
      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{announcement.content}</p>
      <time className="mt-2 block text-xs text-gray-400">
        {new Date(announcement.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </time>
    </div>
  );
}

export default function PortalDashboard() {
  const { user, token } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!token) return;

    apiFetch('/announcements', { token })
      .then((data) => setAnnouncements(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => {});

    apiFetch('/users/profile', { token })
      .then(setProfile)
      .catch(() => {});
  }, [token]);

  if (!user) return null;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {user.firstName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome to your {user.role.toLowerCase()} dashboard
        </p>
      </div>

      {/* Role-specific stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {user.role === 'ADMIN' && (
          <>
            <StatCard label="Role" value="Administrator" />
            <StatCard label="Announcements" value={announcements.length} />
          </>
        )}
        {user.role === 'TEACHER' && (
          <>
            <StatCard label="Role" value="Teacher" />
            <StatCard label="Department" value={profile?.teacherProfile?.department || '—'} />
          </>
        )}
        {user.role === 'STUDENT' && (
          <>
            <StatCard label="Role" value="Student" />
            <StatCard label="Admission No." value={profile?.studentProfile?.admissionNo || '—'} />
            <StatCard label="Class" value={profile?.studentProfile?.class?.name || '—'} />
          </>
        )}
        {user.role === 'PARENT' && (
          <>
            <StatCard label="Role" value="Parent" />
            <StatCard label="Children" value={profile?.parentProfile?.children?.length || 0} />
          </>
        )}
        {user.role === 'STAFF' && (
          <>
            <StatCard label="Role" value="Staff" />
            <StatCard label="Department" value={profile?.staffProfile?.department || '—'} />
            <StatCard label="Position" value={profile?.staffProfile?.position || '—'} />
          </>
        )}
      </div>

      {/* Recent Announcements */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Announcements</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-gray-500">No announcements to display.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a: any) => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
