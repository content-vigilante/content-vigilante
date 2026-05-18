import { Owl } from '@/components/Owl';
import { getSyncStore } from '@/lib/syncStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SharedSnapshot {
  client: string;
  generatedAt: string;
  brand?: {
    name?: string;
    color?: string;
    logoUrl?: string;
    accentText?: string;
  };
  posts: Array<{
    id: string;
    title: string;
    body: string;
    platform: string;
    scheduledFor?: string;
    brandScore?: number;
  }>;
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = await getSyncStore();
  const entry = await store.get(`share-${token}`);
  if (!entry?.data) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <Owl className="mb-6 h-12 w-12" />
        <h1 className="font-display text-3xl font-bold tracking-tight">
          This link is empty or expired.
        </h1>
        <p className="mt-3 text-[var(--color-cv-stone-600)]">
          Ask your collaborator to regenerate it from the Exports page.
        </p>
      </main>
    );
  }
  const snap = entry.data as SharedSnapshot;
  const brand = snap.brand ?? {};
  const accent = brand.color ?? '#1F8A4C';

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 flex items-end justify-between border-b border-[var(--color-cv-line)] pb-6">
        <div className="flex items-center gap-3">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.name ?? snap.client}
              className="h-10 w-10 rounded-md object-contain"
            />
          ) : (
            <Owl className="h-8 w-8" />
          )}
          <div>
            <div
              className="font-mono text-[11px] uppercase tracking-[0.2em]"
              style={{ color: accent }}
            >
              {brand.name ?? 'Content Vigilante'} · Approval portal
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{snap.client}</h1>
          </div>
        </div>
        <div className="text-right font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-cv-stone-500)]">
          Snapshot
          <br />
          {new Date(snap.generatedAt).toLocaleString()}
        </div>
      </header>

      <p className="mb-8 text-sm text-[var(--color-cv-stone-600)]">
        Below is the content queued for review. Reply with feedback — this page is read-only and
        tied to a private token.
      </p>

      <div className="space-y-4">
        {snap.posts.map((p) => (
          <article
            key={p.id}
            className="rounded-lg border bg-white p-5"
            style={{ borderColor: 'var(--color-cv-line)' }}
          >
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-mono uppercase tracking-[0.2em]" style={{ color: accent }}>
                {p.platform}
              </span>
              {p.brandScore != null && (
                <span className="text-[var(--color-cv-stone-600)]">
                  brand score · {p.brandScore}/100
                </span>
              )}
            </div>
            <h2 className="mb-2 font-display text-lg font-bold tracking-tight">{p.title}</h2>
            {p.body && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-cv-stone-600)]">
                {p.body}
              </p>
            )}
            {p.scheduledFor && (
              <div className="mt-3 text-[11px] text-[var(--color-cv-stone-500)]">
                Scheduled · {new Date(p.scheduledFor).toLocaleString()}
              </div>
            )}
          </article>
        ))}
        {snap.posts.length === 0 && (
          <div className="rounded-lg border border-[var(--color-cv-line)] bg-white p-6 text-sm text-[var(--color-cv-stone-600)]">
            No drafts or scheduled posts in this snapshot.
          </div>
        )}
      </div>

      <footer className="mt-12 border-t border-[var(--color-cv-line)] pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-cv-stone-500)]">
        Read-only · powered by Content Vigilante
      </footer>
    </main>
  );
}
