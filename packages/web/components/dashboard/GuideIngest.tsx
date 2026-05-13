'use client';

import { CheckCircle2, FileText, Loader2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, Pill } from './ui';

interface ParsedRule {
  id: string;
  category: 'tone' | 'vocabulary' | 'structure' | 'readability';
  description: string;
}

interface StoredGuide {
  source: string;
  language: string;
  rules: ParsedRule[];
  rawText: string;
  ingestedAt: string;
}

export function GuideIngest() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guide, setGuide] = useState<StoredGuide | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem('cv:store:customGuide');
    if (raw) {
      try {
        setGuide(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, []);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const provider = sessionStorage.getItem('cv:provider') ?? '';
      const apiKey = sessionStorage.getItem('cv:apiKey') ?? '';
      const model = sessionStorage.getItem('cv:model') ?? '';
      if (provider) form.append('provider', provider);
      if (apiKey) form.append('apiKey', apiKey);
      if (model) form.append('model', model);
      const res = await fetch('/api/ingest-guide', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ingest failed.');
      const stored: StoredGuide = { ...json.guide, ingestedAt: new Date().toISOString() };
      localStorage.setItem('cv:store:customGuide', JSON.stringify(stored));
      setGuide(stored);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    localStorage.removeItem('cv:store:customGuide');
    setGuide(null);
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Upload your brand guide</h3>
        {guide && <Pill tone="good"><CheckCircle2 className="mr-1 inline h-3 w-3" />active</Pill>}
      </div>

      {!guide && (
        <>
          <p className="mb-3 text-sm text-[var(--color-fg-muted)]">
            PDF in, structured rules out. Runs heuristic extraction always; uses your LLM key
            (set on Guardrails) for higher-quality rule extraction when available.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <Button onClick={() => fileRef.current?.click()} variant="outline">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? 'Extracting…' : 'Upload PDF'}
          </Button>
        </>
      )}

      {guide && (
        <>
          <div className="mb-3 flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-[var(--color-fg-muted)]" />
            <span className="font-medium">{guide.source}</span>
            <span className="text-xs text-[var(--color-fg-muted)]">
              · {guide.rules.length} rules · {guide.language.toUpperCase()}
            </span>
          </div>
          <div className="mb-3 max-h-48 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-2">
            {guide.rules.slice(0, 12).map((r) => (
              <div key={r.id} className="flex gap-2 py-1 text-xs">
                <Pill tone={r.category === 'vocabulary' ? 'warn' : 'default'}>{r.category}</Pill>
                <span className="text-[var(--color-fg)]">{r.description}</span>
              </div>
            ))}
            {guide.rules.length > 12 && (
              <div className="mt-1 text-[11px] text-[var(--color-fg-muted)]">
                + {guide.rules.length - 12} more
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => fileRef.current?.click()} variant="outline">
              Replace
            </Button>
            <Button onClick={clear} variant="ghost">
              Clear
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </>
      )}

      {error && (
        <div className="mt-3 rounded-md border border-[var(--color-bad)]/30 bg-[var(--color-bad)]/5 px-3 py-2 text-xs text-[var(--color-bad)]">
          {error}
        </div>
      )}
    </div>
  );
}
