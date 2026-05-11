import { AuditClient } from '@/components/AuditClient';
import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

export default function AuditPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex items-center gap-2 font-semibold">
          <Shield className="h-5 w-5 text-[var(--color-accent)]" />
          Content Vigilante
        </div>
      </header>

      <h1 className="mb-2 text-3xl font-bold tracking-tight">Audit</h1>
      <p className="mb-8 text-[var(--color-fg-muted)]">
        Pick a provider, paste your content or point us at a URL, and run. The bundled Mailchimp
        Content Style Guide (57 rules) is used for English by default.
      </p>

      <AuditClient />
    </main>
  );
}
