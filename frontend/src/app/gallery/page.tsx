'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { apiFetch } from '@/lib/api';

export default function GalleryPage() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/cms/gallery')
      .then((data) => setImages(Array.isArray(data) ? data : []))
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <main>
        <section className="bg-gradient-to-br from-brand-800 to-brand-900 py-16 text-white sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold sm:text-5xl">Gallery</h1>
            <p className="mt-4 max-w-2xl text-lg text-brand-100">A glimpse into life at Frannberry School.</p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="text-center text-gray-500">Loading gallery…</div>
            ) : images.length === 0 ? (
              <div className="text-center text-gray-500">No gallery images available yet.</div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((img: any) => (
                  <div key={img.id} className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="aspect-video overflow-hidden bg-gray-100">
                      <img src={img.imageUrl} alt={img.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900">{img.title}</h3>
                      {img.description && <p className="mt-1 text-sm text-gray-500">{img.description}</p>}
                      {img.category && <span className="mt-2 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{img.category}</span>}
                    </div>
                  </div>
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
