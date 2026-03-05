import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Frannberry School',
  description: 'Welcome to Frannberry School – Nurturing Excellence, Building Futures',
  keywords: ['school', 'education', 'Frannberry', 'UK school'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
