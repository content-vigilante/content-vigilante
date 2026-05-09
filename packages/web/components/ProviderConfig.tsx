'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface Props {
  provider: 'anthropic' | 'openai' | 'ollama';
  onProviderChange: (p: 'anthropic' | 'openai' | 'ollama') => void;
  apiKey: string;
  onApiKeyChange: (s: string) => void;
  model: string;
  onModelChange: (s: string) => void;
}

const DEFAULT_MODELS: Record<Props['provider'], string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o-mini',
  ollama: 'llama3.3:70b',
};

export function ProviderConfig(props: Props) {
  const [showKey, setShowKey] = useState(false);
  const placeholderKey =
    props.provider === 'anthropic'
      ? 'sk-ant-...'
      : props.provider === 'openai'
        ? 'sk-...'
        : 'no key needed';

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
      <h3 className="mb-4 font-semibold">Provider</h3>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {(['anthropic', 'openai', 'ollama'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => props.onProviderChange(p)}
            className={`rounded-md border px-3 py-2 text-sm font-medium capitalize transition ${
              props.provider === p
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-fg)]'
                : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <label
        htmlFor="provider-api-key"
        className="mb-1 block text-xs uppercase tracking-wide text-[var(--color-fg-muted)]"
      >
        API key
      </label>
      <div className="relative mb-3">
        <input
          id="provider-api-key"
          type={showKey ? 'text' : 'password'}
          value={props.apiKey}
          onChange={(e) => props.onApiKeyChange(e.target.value)}
          placeholder={placeholderKey}
          disabled={props.provider === 'ollama'}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 pr-10 text-sm outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
        />
        {props.provider !== 'ollama' && (
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            aria-label={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      <p className="mb-4 text-xs text-[var(--color-fg-muted)]">
        Stored in this browser session only. Cleared when you close the tab.
      </p>

      <label
        htmlFor="provider-model"
        className="mb-1 block text-xs uppercase tracking-wide text-[var(--color-fg-muted)]"
      >
        Model (optional)
      </label>
      <input
        id="provider-model"
        type="text"
        value={props.model}
        onChange={(e) => props.onModelChange(e.target.value)}
        placeholder={DEFAULT_MODELS[props.provider]}
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
      />
      <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
        Default: <code>{DEFAULT_MODELS[props.provider]}</code>
      </p>

      <div className="mt-6 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-fg-muted)]">
        <p className="mb-1 font-medium text-[var(--color-fg)]">Brand guide</p>
        <p>
          Auto-selects <strong>Mailchimp</strong> for English or <strong>Designers Italia</strong>{' '}
          for Italian. Custom guides land in v0.2.
        </p>
      </div>
    </div>
  );
}
