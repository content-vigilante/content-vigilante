'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console; in prod you'd ship to Sentry or similar.
    console.error('app error:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center px-8 py-16">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-cv-line)] bg-white/60 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-cv-stone-500)]">
        <AlertTriangle className="h-3 w-3 text-[var(--color-bad)]" />
        Something broke
      </div>

      <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-[var(--color-cv-ink)]">
        The Vigilante hit a snag.
      </h1>

      <p className="mt-4 text-lg text-[var(--color-cv-stone-600)]">
        We caught a runtime error before it crashed your workspace. Your data is safe — it lives in
        your browser. Try again, or head home.
      </p>

      {error.message && (
        <pre className="mt-6 max-w-full overflow-auto rounded-md border border-[var(--color-cv-line)] bg-white/60 p-3 font-mono text-xs text-[var(--color-cv-stone-600)]">
          {error.message}
          {error.digest && <span className="opacity-50">{`\n\ndigest: ${error.digest}`}</span>}
        </pre>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-cv-ink)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md border border-[var(--color-cv-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-cv-ink)] hover:bg-[var(--color-cv-paper-2)]"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
