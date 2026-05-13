'use client';

import { Loader2, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProviderConfig } from './ProviderConfig';
import { Report } from './Report';
import type { AuditResult } from './types';

const SAMPLE_OFF_BRAND = `We are pleased to announce our new synergistic platform.
This best-in-class solution will leverage cutting-edge AI to help our marketing ninjas
crush it across the funnel. We're confident our automagical workflow will utilize
your data to unlock value at scale.

Click here to learn more!!`;

type InputMode = 'text' | 'url';

export function AuditClient() {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [provider, setProvider] = useState<'anthropic' | 'openai' | 'ollama'>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [content, setContent] = useState(SAMPLE_OFF_BRAND);
  const [url, setURL] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Restore session-only key (cleared when tab closes)
    const stored = sessionStorage.getItem('cv:apiKey');
    if (stored) setApiKey(stored);
    const storedProvider = sessionStorage.getItem('cv:provider');
    if (storedProvider) setProvider(storedProvider as typeof provider);
    const storedInputMode = sessionStorage.getItem('cv:inputMode');
    if (storedInputMode === 'text' || storedInputMode === 'url') setInputMode(storedInputMode);
  }, []);

  useEffect(() => {
    if (apiKey) sessionStorage.setItem('cv:apiKey', apiKey);
    sessionStorage.setItem('cv:provider', provider);
    sessionStorage.setItem('cv:inputMode', inputMode);
  }, [apiKey, inputMode, provider]);

  async function runAudit() {
    setError(null);
    setResult(null);
    if (inputMode === 'text' && !content.trim()) {
      setError('Paste some content to audit.');
      return;
    }
    if (inputMode === 'url' && !url.trim()) {
      setError('Enter a URL to audit.');
      return;
    }
    if (provider !== 'ollama' && !apiKey) {
      setError(`An API key is required for ${provider}.`);
      return;
    }
    setLoading(true);
    try {
      let customGuide: unknown;
      try {
        const raw = localStorage.getItem('cv:store:customGuide');
        if (raw) customGuide = JSON.parse(raw);
      } catch {
        /* ignore */
      }
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          inputType: inputMode,
          content: inputMode === 'text' ? content : undefined,
          url: inputMode === 'url' ? url : undefined,
          provider,
          apiKey,
          model: model || undefined,
          customGuide,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      setResult((await res.json()) as AuditResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_360px]">
      <section>
        <div className="mb-4 flex gap-2">
          {(['text', 'url'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setInputMode(mode)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                inputMode === mode
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-fg)]'
                  : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              {mode === 'text' ? 'Paste text' : 'Audit a URL'}
            </button>
          ))}
        </div>

        <label
          htmlFor={inputMode === 'text' ? 'audit-content' : 'audit-url'}
          className="mb-2 block text-sm font-medium text-[var(--color-fg-muted)]"
        >
          {inputMode === 'text' ? 'Content' : 'URL'}
        </label>
        {inputMode === 'text' ? (
          <>
            <textarea
              id="audit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 font-mono text-sm leading-relaxed outline-none focus:border-[var(--color-accent)]"
              placeholder="Paste a blog post, ad copy, email, landing page text…"
            />
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-fg-muted)]">
              <span>{content.length.toLocaleString()} chars</span>
              <button
                onClick={() => setContent(SAMPLE_OFF_BRAND)}
                className="hover:text-[var(--color-fg)]"
                type="button"
              >
                Reset to sample
              </button>
            </div>
          </>
        ) : (
          <div>
            <input
              id="audit-url"
              type="url"
              value={url}
              onChange={(e) => setURL(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
              placeholder="https://example.com/blog-post"
            />
            <p className="mt-3 text-xs text-[var(--color-fg-muted)]">
              We&apos;ll fetch the page server-side, extract the readable text, and audit it against
              the matching bundled guide.
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={runAudit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-5 py-2.5 font-medium text-[var(--color-accent-fg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loading ? 'Auditing…' : 'Run audit'}
          </button>
          {error ? (
            <span className="text-sm text-[var(--color-bad)]">{error}</span>
          ) : (
            <span className="text-xs text-[var(--color-fg-muted)]">
              Calls run server-side; your key is forwarded to your chosen provider, never stored.
            </span>
          )}
        </div>

        {result && <Report result={result} />}
      </section>

      <aside>
        <ProviderConfig
          provider={provider}
          onProviderChange={setProvider}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          model={model}
          onModelChange={setModel}
        />
      </aside>
    </div>
  );
}
