'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  const bg = accent || 'bg-white dark:bg-gray-900';
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 ${bg} p-5 shadow-sm`}>
      <div className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
    </Link>
  );
}

function AnnouncementCard({ announcement }: { announcement: any }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{announcement.title}</h3>
        <span className="shrink-0 rounded-full bg-brand-50 dark:bg-brand-900 px-2 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-200">{announcement.scope}</span>
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{announcement.content}</p>
      <time className="mt-2 block text-xs text-gray-400">{new Date(announcement.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
    </div>
  );
}

export default function PortalDashboard() {
  const { user, token } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [membership, setMembership] = useState<any>(null);

  useEffect(() => {
    if (!token) return;

    apiFetch('/announcements', { token })
      .then((data) => setAnnouncements(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => {});

    apiFetch('/users/profile', { token })
      .then(setProfile)
      .catch(() => {});

    apiFetch('/notifications/unread-count', { token })
      .then((c) => setUnreadCount(typeof c === 'number' ? c : 0))
      .catch(() => {});

    apiFetch('/events?limit=5', { token })
      .then((data) => setEvents(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => {});

    apiFetch('/school/me', { token })
      .then(setMembership)
      .catch(() => {});

    if (user?.role === 'ADMIN') {
      apiFetch('/reports/enrollment', { token })
        .then(setAdminStats)
        .catch(() => {});
    }
  }, [token, user?.role]);

  if (!user) return null;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {greeting()}, {user.firstName}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome to your {user.role.toLowerCase()} dashboard
          {unreadCount > 0 && <span className="ml-2 inline-flex items-center rounded-full bg-red-100 dark:bg-red-900 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-200">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</span>}
        </p>
      </div>

      {membership && (
        <section className="mb-8" aria-label="Your schools">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Your schools</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(membership.schools || []).map((school: any) => (
              <div key={school.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{school.name}</p>
                <p className="text-xs text-gray-500">{school.phase} · ages {school.ageMin}–{school.ageMax}</p>
              </div>
            ))}
            {membership.schools?.length === 0 && <p className="text-sm text-gray-500">No school membership.</p>}
          </div>
          {membership.class && (
            <p className="mt-3 text-sm text-gray-600">Class: {membership.class.name} ({membership.class.keyStage})</p>
          )}
          {membership.children?.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-300">
              {membership.children.map((child: any) => (
                <li key={child.studentId}>
                  {child.firstName} {child.lastName} · {child.school?.name || 'No school'} · {child.class?.name || 'No class'}
                  {child.canLogin ? '' : ' · cannot sign in'}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Admin Dashboard ──────────────────────────────────────────────── */}
      {user.role === 'ADMIN' && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Students" value={adminStats?.totalStudents ?? '—'} />
            <StatCard label="Total Teachers" value={adminStats?.totalTeachers ?? '—'} />
            <StatCard label="Total Parents" value={adminStats?.totalParents ?? '—'} />
            <StatCard label="Total Staff" value={adminStats?.totalStaff ?? '—'} />
          </div>
          <h2 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quick Actions</h2>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction href="/portal/users" label="Manage Users" icon="👥" />
            <QuickAction href="/portal/csv-import" label="CSV Import" icon="📄" />
            <QuickAction href="/portal/reports" label="Reports" icon="📊" />
            <QuickAction href="/portal/audit-logs" label="Audit Logs" icon="📋" />
            <QuickAction href="/portal/announcements" label="Announcements" icon="📢" />
            <QuickAction href="/portal/permissions" label="Permissions" icon="🔒" />
            <QuickAction href="/portal/events" label="Events" icon="📅" />
            <QuickAction href="/portal/fees" label="Fees" icon="💰" />
          </div>
        </>
      )}

      {/* ── Teacher Dashboard ────────────────────────────────────────────── */}
      {user.role === 'TEACHER' && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Department" value={profile?.teacherProfile?.department || '—'} />
            <StatCard label="Qualification" value={profile?.teacherProfile?.qualification || '—'} />
            <StatCard label="Employee ID" value={profile?.teacherProfile?.employeeId || '—'} />
            <StatCard label="Unread Notifications" value={unreadCount} />
          </div>
          <h2 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quick Actions</h2>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction href="/portal/assignments" label="Assignments" icon="📝" />
            <QuickAction href="/portal/results" label="Enter Results" icon="📊" />
            <QuickAction href="/portal/attendance" label="Mark Attendance" icon="✅" />
            <QuickAction href="/portal/conferences" label="Conferences" icon="🤝" />
            <QuickAction href="/portal/timetable" label="Timetable" icon="🕐" />
            <QuickAction href="/portal/messages" label="Messages" icon="💬" />
          </div>
        </>
      )}

      {/* ── Student Dashboard ────────────────────────────────────────────── */}
      {user.role === 'STUDENT' && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Admission No." value={profile?.studentProfile?.admissionNo || '—'} />
            <StatCard label="Class" value={profile?.studentProfile?.class?.name || '—'} />
            <StatCard label="Unread Notifications" value={unreadCount} />
            <StatCard label="Announcements" value={announcements.length} />
          </div>
          <h2 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quick Actions</h2>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickAction href="/portal/assignments" label="My Assignments" icon="📝" />
            <QuickAction href="/portal/results" label="My Results" icon="📊" />
            <QuickAction href="/portal/timetable" label="Timetable" icon="🕐" />
            <QuickAction href="/portal/attendance" label="Attendance" icon="✅" />
            <QuickAction href="/portal/analytics" label="Performance" icon="📈" />
            <QuickAction href="/portal/fees" label="Fees" icon="💰" />
          </div>
        </>
      )}

      {/* ── Parent Dashboard ─────────────────────────────────────────────── */}
      {user.role === 'PARENT' && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Children" value={membership?.children?.length ?? 0} />
            <StatCard label="Unread Notifications" value={unreadCount} />
            <StatCard label="Announcements" value={announcements.length} />
          </div>
          <h2 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quick Actions</h2>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickAction href="/portal/results" label="View Results" icon="📊" />
            <QuickAction href="/portal/attendance" label="Attendance" icon="✅" />
            <QuickAction href="/portal/fees" label="Fees & Payments" icon="💰" />
            <QuickAction href="/portal/conferences" label="Book Conference" icon="🤝" />
            <QuickAction href="/portal/analytics" label="Performance" icon="📈" />
            <QuickAction href="/portal/messages" label="Messages" icon="💬" />
          </div>
        </>
      )}

      {/* ── Staff Dashboard ──────────────────────────────────────────────── */}
      {user.role === 'STAFF' && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Department" value={profile?.staffProfile?.department || '—'} />
            <StatCard label="Position" value={profile?.staffProfile?.position || '—'} />
            <StatCard label="Unread Notifications" value={unreadCount} />
          </div>
          <h2 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quick Actions</h2>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QuickAction href="/portal/events" label="Events" icon="📅" />
            <QuickAction href="/portal/announcements" label="Announcements" icon="📢" />
            <QuickAction href="/portal/messages" label="Messages" icon="💬" />
          </div>
        </>
      )}

      {/* ── Upcoming Events ──────────────────────────────────────────────── */}
      {events.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Upcoming Events</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e: any) => (
              <div key={e.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">{e.type}</span>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{e.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(e.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {e.location && <span> · {e.location}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Announcements ─────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Announcements</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No announcements to display.</p>
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
