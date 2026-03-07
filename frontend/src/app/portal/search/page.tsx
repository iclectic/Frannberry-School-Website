'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface SearchResults {
  announcements: { id: string; title: string; scope: string; createdAt: string }[];
  blogPosts: { id: string; title: string; slug: string; excerpt?: string; createdAt: string }[];
  users: { id: string; firstName: string; lastName: string; email: string; role: string }[];
  conversations: { id: string; title: string; updatedAt: string }[];
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    const token = localStorage.getItem('token');
    try {
      const data = await apiFetch(`/search?q=${encodeURIComponent(query.trim())}`, { token: token || undefined });
      setResults(data);
    } catch {
      setResults(null);
    }
    setLoading(false);
  }

  const totalResults = results
    ? results.announcements.length + results.blogPosts.length + results.users.length + results.conversations.length
    : 0;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Search</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Search announcements, blog posts, users, conversations…"
          className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )}

      {!loading && searched && results && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalResults} result{totalResults !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>

          {/* Announcements */}
          {results.announcements.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Announcements</h2>
              <div className="space-y-2">
                {results.announcements.map((a) => (
                  <Link key={a.id} href="/portal/announcements" className="block bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{a.scope}</span>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{a.title}</h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{new Date(a.createdAt).toLocaleDateString('en-GB')}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Blog Posts */}
          {results.blogPosts.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Blog Posts</h2>
              <div className="space-y-2">
                {results.blogPosts.map((b) => (
                  <Link key={b.id} href={`/blog/${b.slug}`} className="block bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{b.title}</h3>
                    {b.excerpt && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{b.excerpt}</p>}
                    <p className="text-xs text-gray-400 mt-1">{new Date(b.createdAt).toLocaleDateString('en-GB')}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {results.users.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Users</h2>
              <div className="space-y-2">
                {results.users.map((u) => (
                  <div key={u.id} className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{u.firstName} {u.lastName}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{u.email} · {u.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversations */}
          {results.conversations.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Conversations</h2>
              <div className="space-y-2">
                {results.conversations.map((c) => (
                  <Link key={c.id} href="/portal/messages" className="block bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{c.title || 'Untitled Conversation'}</h3>
                    <p className="text-xs text-gray-400 mt-1">Last updated: {new Date(c.updatedAt).toLocaleDateString('en-GB')}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {totalResults === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-12">No results found. Try a different search term.</p>
          )}
        </div>
      )}

      {!searched && (
        <p className="text-center text-gray-400 dark:text-gray-500 py-12">Enter at least 2 characters to search across announcements, blog posts, users, and conversations.</p>
      )}
    </div>
  );
}
