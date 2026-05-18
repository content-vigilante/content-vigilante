'use client';

import { Button, Card, PageHeader, Pill } from '@/components/dashboard/ui';
import { CONTEXT_KEY, type ContextItem } from '@/lib/contextItem';
import { useStore } from '@/lib/store';
import { Copy, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

interface Issue {
  kind: string;
  message: string;
}

interface AuditResult {
  altText: string;
  description: string;
  ocrText: string;
  contextSummary: string;
  brandCompliance: {
    score: number;
    palette?: string[];
    issues: Issue[];
  };
}

export default function AssetsPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [, setContext] = useStore<ContextItem[]>(CONTEXT_KEY, []);
  const fileRef = useRef<HTMLInputElement>(null);

  async function run(file: File) {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const provider = sessionStorage.getItem('cv:provider') ?? 'anthropic';
      const apiKey = sessionStorage.getItem('cv:apiKey') ?? '';
      const model = sessionStorage.getItem('cv:model') ?? '';
      if (!apiKey) throw new Error('Set a provider key on Guardrails first.');

      let brandRules: string[] = [];
      try {
        const raw = localStorage.getItem('cv:store:customGuide');
        if (raw) {
          const g = JSON.parse(raw) as { rules?: Array<{ description: string }> };
          brandRules = (g.rules ?? []).map((r) => r.description).slice(0, 16);
        }
      } catch {
        /* ignore */
      }

      const reader = new FileReader();
      reader.onload = () => setPreview(typeof reader.result === 'string' ? reader.result : null);
      reader.readAsDataURL(file);
      setFileName(file.name);

      const fd = new FormData();
      fd.append('file', file);
      fd.append('provider', provider);
      fd.append('apiKey', apiKey);
      if (model) fd.append('model', model);
      fd.append('brandRules', JSON.stringify(brandRules));

      const res = await fetch('/api/audit-asset', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'audit failed');
      setResult(json as AuditResult);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function saveToContext() {
    if (!result || !fileName) return;
    const blob = [
      `Asset: ${fileName}`,
      `Description: ${result.description}`,
      `Alt text: ${result.altText}`,
      result.ocrText ? `Embedded text: ${result.ocrText}` : '',
      `Use it for: ${result.contextSummary}`,
      result.brandCompliance.palette?.length
        ? `Palette: ${result.brandCompliance.palette.join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    setContext((prev) => [
      {
        id: `ctx-${Date.now()}`,
        name: fileName,
        type: 'asset-audit',
        size: blob.length,
        text: blob,
        tags: ['asset'],
        uploadedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  function copyAlt() {
    if (!result?.altText) return;
    navigator.clipboard.writeText(result.altText).catch(() => {});
  }

  return (
    <>
      <PageHeader
        title="Asset audit"
        subtitle="Upload a creative — image now, video next. Get alt text, OCR, brand-compliance score, and a palette readout in one pass."
        actions={
          <Button onClick={() => fileRef.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Audit asset
          </Button>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) run(f);
        }}
      />

      {!preview && !busy && (
        <Card>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) run(f);
            }}
            className="block w-full rounded-md border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-elev)] p-10 text-center text-sm text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-fg)]"
          >
            <ImageIcon className="mx-auto mb-3 h-8 w-8" />
            Drop an image, or click to choose
            <div className="mt-1 text-[11px]">
              JPEG / PNG / WEBP up to 8 MB · uses the same provider key as Studio
            </div>
          </button>
        </Card>
      )}

      {err && (
        <div className="mb-4 rounded-md border border-[var(--color-bad)]/30 bg-[var(--color-bad)]/5 px-3 py-2 text-xs text-[var(--color-bad)]">
          {err}
        </div>
      )}

      {preview && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <div className="mb-2 text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
              Preview
            </div>
            <img
              src={preview}
              alt="Asset preview"
              className="w-full rounded-md border border-[var(--color-border)] object-contain"
            />
            <div className="mt-2 text-[11px] text-[var(--color-fg-muted)]">{fileName}</div>
          </Card>

          <div className="space-y-4">
            {busy && (
              <Card>
                <div className="flex items-center gap-2 text-sm text-[var(--color-fg-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Auditing…
                </div>
              </Card>
            )}
            {result && (
              <>
                <Card>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">Brand compliance</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{result.brandCompliance.score}</span>
                      <span className="text-xs text-[var(--color-fg-muted)]">/100</span>
                    </div>
                  </div>
                  <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-elev)]">
                    <div
                      className="h-full"
                      style={{
                        width: `${result.brandCompliance.score}%`,
                        background:
                          result.brandCompliance.score >= 80
                            ? 'var(--color-good)'
                            : result.brandCompliance.score >= 60
                              ? 'var(--color-warn)'
                              : 'var(--color-bad)',
                      }}
                    />
                  </div>

                  {result.brandCompliance.palette && result.brandCompliance.palette.length > 0 && (
                    <div className="mb-3">
                      <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--color-fg-muted)]">
                        Palette
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.brandCompliance.palette.map((p) => (
                          <div
                            key={p}
                            className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px]"
                          >
                            <span
                              className="h-3 w-3 rounded-full border border-[var(--color-border)]"
                              style={{ background: p }}
                            />
                            <code>{p}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {result.brandCompliance.issues.length === 0 ? (
                      <div className="text-xs text-[var(--color-good)]">
                        No issues flagged. Ship it.
                      </div>
                    ) : (
                      result.brandCompliance.issues.map((iss, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <Pill tone="warn">{iss.kind}</Pill>
                          <span className="text-[var(--color-fg-muted)]">{iss.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">Alt text</h3>
                    <Button onClick={copyAlt} variant="ghost">
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="text-sm">{result.altText}</p>
                </Card>

                <Card>
                  <h3 className="mb-2 font-semibold">Description & context</h3>
                  <p className="text-sm text-[var(--color-fg)]">{result.description}</p>
                  <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
                    {result.contextSummary}
                  </p>
                  {result.ocrText && (
                    <div className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-2">
                      <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
                        Embedded text (OCR)
                      </div>
                      <p className="whitespace-pre-wrap text-xs">{result.ocrText}</p>
                    </div>
                  )}
                  <Button onClick={saveToContext} variant="outline" className="mt-3">
                    Add to Context library
                  </Button>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
