'use client';

import { Sparkles } from 'lucide-react';

const IS_DEMO = process.env.NEXT_PUBLIC_CV_DEMO_MODE === '1';

export function DemoBadge() {
  if (!IS_DEMO) return null;
  return (
    <div className="pointer-events-auto fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-[var(--color-cv-line)] bg-white/95 px-3 py-1.5 text-[11px] font-medium text-[var(--color-cv-ink)] shadow-md backdrop-blur">
      <Sparkles className="h-3 w-3 text-[var(--color-cv-green-deep)]" />
      Demo · seed data — your edits stay in this browser
      <a
        href="https://content-vigilante.vercel.app"
        className="ml-1 rounded-full bg-[var(--color-cv-ink)] px-2 py-0.5 text-white"
      >
        Live app →
      </a>
    </div>
  );
}
