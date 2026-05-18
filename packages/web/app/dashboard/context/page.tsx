'use client';

import { Button, Card, PageHeader, Pill } from '@/components/dashboard/ui';
import { CONTEXT_KEY, type ContextItem } from '@/lib/contextItem';
import { useStore } from '@/lib/store';
import { FileText, Lightbulb, Loader2, Search, Tag, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

interface Idea {
  title: string;
  angle: string;
  draft: string;
  sources?: string[];
}

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function ContextPage() {
  const [items, setItems] = useStore<ContextItem[]>(CONTEXT_KEY, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [goal, setGoal] = useState('');
  const [platform, setPlatform] = useState('linkedin');
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [ideating, setIdeating] = useState(false);
  const [ideaErr, setIdeaErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const i of items) for (const t of i.tags) s.add(t);
    return Array.from(s).sort();
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => (activeTag ? i.tags.includes(activeTag) : true))
      .filter(
        (i) =>
          !q ||
          i.name.toLowerCase().includes(q) ||
          i.text.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      )
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }, [items, query, activeTag]);

  async function ingest(filesToUpload: FileList) {
    setBusy(true);
    setError(null);
    const next: ContextItem[] = [];
    for (const f of Array.from(filesToUpload)) {
      try {
        const fd = new FormData();
        fd.append('file', f);
        const res = await fetch('/api/context/extract', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'extract failed');
        next.push({
          id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: json.name,
          type: json.type || 'unknown',
          size: json.size || 0,
          text: json.text || '',
          tags: [],
          uploadedAt: new Date().toISOString(),
        });
      } catch (err) {
        setError(`${f.name}: ${(err as Error).message}`);
      }
    }
    if (next.length > 0) setItems((prev) => [...next, ...prev]);
    setBusy(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) ingest(e.dataTransfer.files);
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function setTags(id: string, tags: string[]) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, tags } : i)));
  }

  function setNotes(id: string, notes: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, notes } : i)));
  }

  async function suggestIdeas() {
    setIdeating(true);
    setIdeaErr(null);
    setIdeas(null);
    try {
      const provider = sessionStorage.getItem('cv:provider') ?? 'anthropic';
      const apiKey = sessionStorage.getItem('cv:apiKey') ?? '';
      const model = sessionStorage.getItem('cv:model') ?? '';
      if (provider !== 'ollama' && !apiKey) {
        throw new Error('Set a provider key on Guardrails first.');
      }
      const ctx = (activeTag ? items.filter((i) => i.tags.includes(activeTag)) : visible).slice(
        0,
        8,
      );
      // Pull brand rules from the custom guide if set.
      let brandRules: string[] = [];
      try {
        const raw = localStorage.getItem('cv:store:customGuide');
        if (raw) {
          const g = JSON.parse(raw) as { rules?: Array<{ description: string }> };
          brandRules = (g.rules ?? []).map((r) => r.description).slice(0, 12);
        }
      } catch {
        /* ignore */
      }
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey,
          model,
          goal,
          platform,
          brandRules,
          context: ctx.map((c) => ({ name: c.name, text: c.text })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'suggest failed');
      setIdeas(json.ideas as Idea[]);
    } catch (err) {
      setIdeaErr((err as Error).message);
    } finally {
      setIdeating(false);
    }
  }

  function draftToStudio(idea: Idea) {
    sessionStorage.setItem(
      'cv:studioDraft',
      JSON.stringify({ title: idea.title, body: idea.draft, platform }),
    );
    window.location.href = '/dashboard/studio';
  }

  return (
    <>
      <PageHeader
        title="Context"
        subtitle="Drop in research, transcripts, briefs, brand notes. The Vigilante uses them to suggest ideas and bias every AI generation."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.md,.markdown,.txt,.csv,.tsv,.json,.html,.htm,.srt,.vtt"
              className="hidden"
              onChange={(e) => e.target.files && ingest(e.target.files)}
            />
            <Button onClick={() => fileRef.current?.click()} variant="outline">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? 'Reading…' : 'Upload files'}
            </Button>
          </>
        }
      />

      <Card
        className="mb-4"
        // Drop zone tints when hovering — done via inline class change.
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="block w-full rounded-md border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6 text-center text-sm text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-fg)]"
        >
          Drag and drop files here · PDF, MD, TXT, CSV, JSON, HTML, SRT/VTT
          <div className="mt-1 text-[11px] text-[var(--color-fg-muted)]">
            All extracted text stays in your browser. Sync to push across devices.
          </div>
        </button>
        {error && (
          <div className="mt-3 rounded-md border border-[var(--color-bad)]/30 bg-[var(--color-bad)]/5 px-3 py-2 text-xs text-[var(--color-bad)]">
            {error}
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[var(--color-accent)]" />
          <h3 className="font-semibold">Suggest post ideas from your context</h3>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Goal — e.g. attract design-system buyers in Italy"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          >
            <option value="linkedin">LinkedIn</option>
            <option value="instagram">Instagram</option>
            <option value="x">X</option>
            <option value="facebook">Facebook</option>
            <option value="newsletter">Newsletter</option>
          </select>
          <Button onClick={suggestIdeas}>
            {ideating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lightbulb className="h-4 w-4" />
            )}
            {ideating ? 'Thinking' : 'Suggest 5 ideas'}
          </Button>
        </div>
        {ideaErr && (
          <div className="mt-3 rounded-md border border-[var(--color-bad)]/30 bg-[var(--color-bad)]/5 px-3 py-2 text-xs text-[var(--color-bad)]">
            {ideaErr}
          </div>
        )}
        {ideas && ideas.length > 0 && (
          <div className="mt-4 space-y-3">
            {ideas.map((idea, i) => (
              <div
                key={i}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4"
              >
                <div className="font-display text-base font-bold tracking-tight">{idea.title}</div>
                <div className="mt-1 text-xs italic text-[var(--color-fg-muted)]">{idea.angle}</div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg)]">{idea.draft}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {idea.sources?.map((s) => (
                    <Pill key={s} tone="default">
                      {s}
                    </Pill>
                  ))}
                  <Button onClick={() => draftToStudio(idea)} variant="outline" className="ml-auto">
                    Open in Studio →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5">
          <Search className="h-4 w-4 text-[var(--color-fg-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search names, content, tags"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                activeTag === null
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                  : 'border border-[var(--color-border)] text-[var(--color-fg-muted)]'
              }`}
            >
              all
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTag(t)}
                className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                  activeTag === t
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                    : 'border border-[var(--color-border)] text-[var(--color-fg-muted)]'
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-[var(--color-fg-muted)]">
            No context yet. Drop a brief, transcript, research doc, or blog post above.
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-fg-muted)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-[11px] text-[var(--color-fg-muted)]">
                      · {bytes(item.size)} · {item.text.length.toLocaleString()} chars
                    </span>
                    {item.tags.map((t) => (
                      <Pill key={t} tone="default">
                        #{t}
                      </Pill>
                    ))}
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs text-[var(--color-fg-muted)]">
                    {item.text || '(no text extracted)'}
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-fg-muted)]">
                      <Tag className="h-3 w-3" />
                      <input
                        defaultValue={item.tags.join(', ')}
                        onBlur={(e) =>
                          setTags(
                            item.id,
                            e.target.value
                              .split(',')
                              .map((s) => s.trim().toLowerCase())
                              .filter(Boolean),
                          )
                        }
                        placeholder="tags (comma separated)"
                        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1 text-xs text-[var(--color-fg)] outline-none"
                      />
                    </label>
                    <input
                      defaultValue={item.notes ?? ''}
                      onBlur={(e) => setNotes(item.id, e.target.value)}
                      placeholder="notes (why does this matter?)"
                      className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1 text-xs text-[var(--color-fg)] outline-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  aria-label="Remove"
                  className="shrink-0 rounded-md p-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-bad)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
