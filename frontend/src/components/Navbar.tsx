'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';

const publicLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/admissions', label: 'Admissions' },
  { href: '/blog', label: 'Blog' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const { user } = useAuth();
  const { theme, resolved, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  function cycleTheme() {
    const next: Record<string, 'light' | 'dark' | 'system'> = { light: 'dark', dark: 'system', system: 'light' };
    setTheme(next[theme]);
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95" role="navigation" aria-label="Main navigation">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-brand-800 dark:text-brand-200">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">FS</span>
          Frannberry School
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={cycleTheme}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label={`Theme: ${theme}`}
            title={`Theme: ${theme}`}
          >
            {resolved === 'dark' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.95 7.95l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.005 9.005 0 0012 21a9.005 9.005 0 008.354-5.646z" /></svg>
            )}
          </button>
          {user ? (
            <Link href="/portal" className="btn-primary ml-2">
              Portal
            </Link>
          ) : (
            <Link href="/login" className="btn-primary ml-2">
              Log In
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="inline-flex items-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-200 px-4 pb-4 dark:border-gray-700 md:hidden">
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={cycleTheme}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {resolved === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'} {theme === 'system' && '(System)'}
          </button>
          {user ? (
            <Link href="/portal" className="btn-primary mt-2 w-full text-center" onClick={() => setMobileOpen(false)}>
              Portal
            </Link>
          ) : (
            <Link href="/login" className="btn-primary mt-2 w-full text-center" onClick={() => setMobileOpen(false)}>
              Log In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
