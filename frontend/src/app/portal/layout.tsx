'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const navByRole: Record<string, { href: string; label: string }[]> = {
  ADMIN: [
    { href: '/portal', label: 'Dashboard' },
    { href: '/portal/users', label: 'Users' },
    { href: '/portal/classes', label: 'Classes' },
    { href: '/portal/timetable', label: 'Timetable' },
    { href: '/portal/attendance', label: 'Attendance' },
    { href: '/portal/assignments', label: 'Assignments' },
    { href: '/portal/results', label: 'Results' },
    { href: '/portal/report-cards', label: 'Report Cards' },
    { href: '/portal/announcements', label: 'Announcements' },
    { href: '/portal/notifications', label: 'Notifications' },
    { href: '/portal/messages', label: 'Messages' },
  ],
  TEACHER: [
    { href: '/portal', label: 'Dashboard' },
    { href: '/portal/timetable', label: 'Timetable' },
    { href: '/portal/attendance', label: 'Attendance' },
    { href: '/portal/assignments', label: 'Assignments' },
    { href: '/portal/results', label: 'Results' },
    { href: '/portal/report-cards', label: 'Report Cards' },
    { href: '/portal/announcements', label: 'Announcements' },
    { href: '/portal/notifications', label: 'Notifications' },
    { href: '/portal/messages', label: 'Messages' },
  ],
  STUDENT: [
    { href: '/portal', label: 'Dashboard' },
    { href: '/portal/timetable', label: 'Timetable' },
    { href: '/portal/attendance', label: 'Attendance' },
    { href: '/portal/assignments', label: 'Assignments' },
    { href: '/portal/results', label: 'Results' },
    { href: '/portal/report-cards', label: 'Report Cards' },
    { href: '/portal/announcements', label: 'Announcements' },
    { href: '/portal/notifications', label: 'Notifications' },
    { href: '/portal/messages', label: 'Messages' },
  ],
  PARENT: [
    { href: '/portal', label: 'Dashboard' },
    { href: '/portal/attendance', label: 'Attendance' },
    { href: '/portal/results', label: 'Results' },
    { href: '/portal/report-cards', label: 'Report Cards' },
    { href: '/portal/announcements', label: 'Announcements' },
    { href: '/portal/notifications', label: 'Notifications' },
    { href: '/portal/messages', label: 'Messages' },
  ],
  STAFF: [
    { href: '/portal', label: 'Dashboard' },
    { href: '/portal/announcements', label: 'Announcements' },
    { href: '/portal/notifications', label: 'Notifications' },
    { href: '/portal/messages', label: 'Messages' },
  ],
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  if (!user) return null;

  const links = navByRole[user.role] || navByRole.STAFF;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-xs font-bold text-white">FS</span>
            <span className="text-sm font-bold text-gray-900">Frannberry Portal</span>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Portal navigation">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <div className="mb-3 text-xs text-gray-500">
              <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
              <div>{user.role}</div>
            </div>
            <button onClick={logout} className="btn-secondary w-full text-xs">
              Sign Out
            </button>
            <Link href="/" className="mt-2 block text-center text-xs text-gray-400 hover:text-gray-600">
              Back to website
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-xs font-bold text-white">FS</span>
            <span className="text-sm font-bold text-gray-900">Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{user.firstName}</span>
            <button onClick={logout} className="text-xs text-red-600 hover:underline">Sign Out</button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2 lg:hidden" aria-label="Portal navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
