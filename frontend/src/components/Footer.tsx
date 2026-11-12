import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-3 text-lg font-bold text-white">Frannberry Schools</h3>
            <p className="text-sm leading-relaxed text-gray-400">
              One trust. Three schools: Nursery, Primary, and Secondary.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="transition hover:text-white">About Us</Link></li>
              <li><Link href="/admissions" className="transition hover:text-white">Admissions</Link></li>
              <li><Link href="/blog" className="transition hover:text-white">News &amp; Blog</Link></li>
              <li><Link href="/gallery" className="transition hover:text-white">Gallery</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>123 School Lane, London, EC1A 1BB</li>
              <li>Tel: 020 7123 4567</li>
              <li>info@frannberry.school</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Portal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="transition hover:text-white">Log In</Link></li>
              <li><Link href="/contact" className="transition hover:text-white">Contact Us</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Frannberry School. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
