import { Owl } from '@/components/Owl';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center px-8 py-16">
      <Owl className="mb-8 h-20 w-20" />
      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-cv-stone-500)]">
        404 · Not on patrol
      </div>
      <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-[var(--color-cv-ink)]">
        Page not found.
      </h1>
      <p className="mt-4 text-lg text-[var(--color-cv-stone-600)]">
        The Vigilante checked everywhere. This URL doesn&apos;t exist on the watch.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-md bg-[var(--color-cv-ink)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
      >
        Back home
      </Link>
    </main>
  );
}
