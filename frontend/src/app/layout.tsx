import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Frannberry School',
  description: 'Welcome to Frannberry School – Nurturing Excellence, Building Futures',
  keywords: ['school', 'education', 'Frannberry', 'UK school'],
  manifest: '/manifest.json',
  themeColor: '#4263eb',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Frannberry School',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
