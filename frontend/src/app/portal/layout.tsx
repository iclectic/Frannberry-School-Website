'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';

const navByRole: Record<string, { href: string; label: string }[]> = {
  ADMIN: [
    { href: '/portal', label: 'Dashboard' },
    { href: '/portal/search', label: 'Search' },
    { href: '/portal/users', label: 'Users' },
    { href: '/portal/classes', label: 'Classes' },
    { href: '/portal/timetable', label: 'Timetable' },
    { href: '/portal/attendance', label: 'Attendance' },
    { href: '/portal/assignments', label: 'Assignments' },
    { href: '/portal/results', label: 'Results' },
    { href: '/portal/report-cards', label: 'Report Cards' },
    { href: '/portal/fees', label: 'Fees' },
    { href: '/portal/events', label: 'Events' },
    { href: '/portal/analytics', label: 'Analytics' },
    { href: '/portal/conferences', label: 'Conferences' },
    { href: '/portal/announcements', label: 'Announcements' },
    { href: '/portal/notifications', label: 'Notifications' },
    { href: '/portal/messages', label: 'Messages' },
    { href: '/portal/reports', label: 'Reports' },
    { href: '/portal/permissions', label: 'Permissions' },
    { href: '/portal/audit-logs', label: 'Audit Logs' },
    { href: '/portal/csv-import', label: 'CSV Import' },
    { href: '/portal/settings', label: 'Settings' },
  ],
  TEACHER: [
    { href: '/portal', label: 'Dashboard' },
    { href: '/portal/search', label: 'Search' },
    { href: '/portal/timetable', label: 'Timetable' },
    { href: '/portal/attendance', label: 'Attendance' },
    { href: '/portal/assignments', label: 'Assignments' },
    { href: '/portal/results', label: 'Results' },
    { href: '/portal/report-cards', label: 'Report Cards' },
    { href: '/portal/conferences', label: 'Conferences' },
    { href: '/portal/events', label: 'Events' },
    { href: '/portal/analytics', label: 'Analytics' },
    { href: '/portal/announcements', label: 'Announcements' },
    { href: '/portal/notifications', label: 'Notifications' },
    { href: '/portal/messages', label: 'Messages' },
    { href: '/portal/settings', label: 'Settings' },
  ],
  STUDENT: [
    { href: '/portal', label: 'Dashboard' },
    { href: '/portal/search', label: 'Search' },
    { href: '/portal/timetable', label: 'Timetable' },
    { href: '/portal/attendance', label: 'Attendance' },
    { href: '/portal/assignments', label: 'Assignments' },
    { href: '/portal/results', label: 'Results' },
    { href: '/portal/report-cards', label: 'Report Cards' },
    { href: '/portal/fees', label: 'Fees' },
    { href: '/portal/events', label: 'Events' },
    { href: '/portal/analytics', label: 'Analytics' },
    { href: '/portal/announcements', label: 'Announcements' },
    { href: '/portal/notifications', label: 'Notifications' },
    { href: '/portal/messages', label: 'Messages' },
    { href: '/portal/settings', label: 'Settings' },
  ],
  PARENT: [
    { href: '/portal', label: 'Dashboard' },
    { href: '/portal/children', label: 'Children' },
    { href: '/portal/search', label: 'Search' },
    { href: '/portal/attendance', label: 'Attendance' },
    { href: '/portal/timetable', label: 'Timetable' },
    { href: '/portal/results', label: 'Results' },
    { href: '/portal/report-cards', label: 'Report Cards' },
    { href: '/portal/fees', label: 'Fees' },
    { href: '/portal/conferences', label: 'Conferences' },
    { href: '/portal/events', label: 'Events' },
    { href: '/portal/analytics', label: 'Analytics' },
    { href: '/portal/announcements', label: 'Announcements' },
    { href: '/portal/notifications', label: 'Notifications' },
    { href: '/portal/messages', label: 'Messages' },
    { href: '/portal/settings', label: 'Settings' },
  ],
  STAFF: [
    { href: '/portal', label: 'Dashboard' },
    { href: '/portal/search', label: 'Search' },
    { href: '/portal/events', label: 'Events' },
    { href: '/portal/announcements', label: 'Announcements' },
    { href: '/portal/notifications', label: 'Notifications' },
    { href: '/portal/settings', label: 'Settings' },
  ],
  HEAD: [
    { href: '/portal', label: 'Dashboard' },
    { href: '/portal/announcements', label: 'Announcements' },
    { href: '/portal/attendance', label: 'Attendance' },
    { href: '/portal/timetable', label: 'Timetable' },
    { href: '/portal/report-cards', label: 'Report Cards' },
    { href: '/portal/messages', label: 'Messages' },
    { href: '/portal/settings', label: 'Settings' },
  ],
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { theme, resolved, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  function cycleTheme() {
    const next: Record<string, 'light' | 'dark' | 'system'> = { light: 'dark', dark: 'system', system: 'light' };
    setTheme(next[theme]);
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user?.mfaSetupRequired && pathname && !pathname.startsWith('/portal/settings/mfa')) {
      router.replace('/portal/settings/mfa');
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  if (!user) return null;

  const links = user.mfaSetupRequired
    ? [{ href: '/portal/settings/mfa', label: 'Authenticator' }]
    : (navByRole[user.role] || navByRole.STAFF);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 lg:block">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-xs font-bold text-white">FS</span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Frannberry Portal</span>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Portal navigation">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              <div className="font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</div>
              <div>{user.role}</div>
            </div>
            <button
              onClick={cycleTheme}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {resolved === 'dark' ? '☀️' : '🌙'} {theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}
            </button>
            <button onClick={logout} className="btn-secondary w-full text-xs">
              Sign Out
            </button>
            <Link href="/" className="mt-2 block text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              Back to website
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-xs font-bold text-white">FS</span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={cycleTheme} className="text-xs text-gray-500 dark:text-gray-400">{resolved === 'dark' ? '☀️' : '🌙'}</button>
            <span className="text-xs text-gray-500 dark:text-gray-400">{user.firstName}</span>
            <button onClick={logout} className="text-xs text-red-600 hover:underline">Sign Out</button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 px-4 py-2 lg:hidden" aria-label="Portal navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
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
