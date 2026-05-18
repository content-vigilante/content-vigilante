import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Content Vigilante — the local-first marketing OS',
    template: '%s · Content Vigilante',
  },
  description:
    'Open-source marketing operating system: calendar, AI brand guardrails, analytics, hybrid CRM. Your data stays yours.',
  metadataBase: new URL('https://content-vigilante-vercel.vercel.app'),
  openGraph: {
    title: 'Content Vigilante — the local-first marketing OS',
    description:
      'Open-source marketing OS: calendar, AI brand guardrails, analytics, hybrid CRM. Your data stays yours.',
    type: 'website',
    siteName: 'Content Vigilante',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Content Vigilante — the local-first marketing OS',
    description: 'Open-source marketing OS. Your data stays yours.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
