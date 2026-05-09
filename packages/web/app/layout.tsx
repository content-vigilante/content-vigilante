import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Content Vigilante',
  description: 'Patrols your content for off-brand violations. Open-source brand voice auditor.',
  metadataBase: new URL('https://content-vigilante.vercel.app'),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
