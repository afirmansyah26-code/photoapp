import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import db from "@/lib/db";
import "./globals.css";

export const dynamic = 'force-dynamic';

function getSettings() {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return map;
  } catch {
    return {};
  }
}

export function generateMetadata(): Metadata {
  const s = getSettings();
  const appName = s.app_name || 'Kolase Pembelajaran';
  const schoolName = s.school_name || '';
  const faviconUrl = s.favicon_url || s.logo_url || '/favicon.ico';
  return {
    title: schoolName ? `${appName} - ${schoolName}` : appName,
    description: `Aplikasi dokumentasi pembelajaran berbasis foto kolase${schoolName ? ` untuk ${schoolName}` : ''}`,
    icons: {
      icon: faviconUrl,
      apple: s.logo_url || '/favicon.ico',
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-surface-dim">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              borderRadius: '12px',
              fontSize: '14px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#f8fafc' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#f8fafc' },
            },
          }}
        />
      </body>
    </html>
  );
}
