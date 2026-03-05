'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiFetch } from '@/lib/api';

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/cms/blog')
      .then((data) => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <main>
        <section className="bg-gradient-to-br from-brand-800 to-brand-900 py-16 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold sm:text-5xl">News &amp; Blog</h1>
            <p className="mt-4 max-w-2xl text-lg text-brand-100">Stay up to date with the latest news, events, and stories from Frannberry School.</p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="text-center text-gray-500">Loading posts…</div>
            ) : posts.length === 0 ? (
              <div className="text-center text-gray-500">No posts available yet. Check back soon!</div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post: any) => (
                  <article key={post.id} className="card group">
                    {post.coverImage && (
                      <div className="mb-4 aspect-video overflow-hidden rounded-lg bg-gray-100">
                        <img src={post.coverImage} alt={post.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                      </div>
                    )}
                    <time className="text-xs font-medium text-gray-400">
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    </time>
                    <h2 className="mt-2 text-lg font-semibold text-gray-900 group-hover:text-brand-700">
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h2>
                    {post.excerpt && <p className="mt-2 text-sm text-gray-600 line-clamp-3">{post.excerpt}</p>}
                    {post.author && (
                      <p className="mt-3 text-xs text-gray-400">By {post.author.firstName} {post.author.lastName}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
