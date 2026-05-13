'use client';

import { Save, Sparkles, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Card, PageHeader, PLATFORM_META, Pill } from '@/components/dashboard/ui';
import { seedPosts, useStore, type Platform, type Post } from '@/lib/store';

const FORBIDDEN = ['synergy', 'synergistic', 'leverage', 'ninja', 'rockstar', 'crush it', 'automagical', 'utilize', 'best-in-class', 'cutting-edge'];

function fleschKincaid(text: string) {
  const sentences = Math.max(text.split(/[.!?]+/).filter(Boolean).length, 1);
  const words = Math.max(text.trim().split(/\s+/).filter(Boolean).length, 1);
  const syllables = text
    .toLowerCase()
    .split(/\s+/)
    .reduce((sum, w) => sum + Math.max(1, (w.match(/[aeiouy]+/g) ?? []).length), 0);
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.round(score);
}

function brandCheck(text: string) {
  const lower = text.toLowerCase();
  const hits = FORBIDDEN.filter((w) => lower.includes(w));
  const exclam = (text.match(/!/g) ?? []).length;
  const allCaps = (text.match(/\b[A-Z]{4,}\b/g) ?? []).length;
  const issues = [
    ...hits.map((w) => ({ kind: 'forbidden', message: `Forbidden term: “${w}”` })),
    ...(exclam > 2 ? [{ kind: 'punct', message: `${exclam} exclamation marks — tone risk` }] : []),
    ...(allCaps > 0 ? [{ kind: 'caps', message: `${allCaps} ALL-CAPS words` }] : []),
  ];
  const score = Math.max(20, 100 - hits.length * 12 - Math.max(0, exclam - 2) * 6 - allCaps * 8);
  return { score, issues };
}

function generateVariants(prompt: string): string[] {
  if (!prompt.trim()) return [];
  return [
    `${prompt.trim()} — here's why it matters for the team shipping it.`,
    `Three quick takeaways on ${prompt.trim()}. Save this if you're building in public.`,
    `We've been thinking about ${prompt.trim()} all week. One thread, no filler. 👇`,
    `Most people get ${prompt.trim()} wrong. Here's the version that actually works.`,
    `${prompt.trim()}: a short note from someone who's tried both ways.`,
  ];
}

export default function StudioPage() {
  const [posts, setPosts] = useStore<Post[]>('posts', seedPosts);
  const [platform, setPlatform] = useState<Platform>('linkedin');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [saved, setSaved] = useState(false);

  const meta = PLATFORM_META[platform];
  const check = useMemo(() => brandCheck(body), [body]);
  const fk = useMemo(() => fleschKincaid(body || 'placeholder text'), [body]);
  const variants = useMemo(() => generateVariants(aiPrompt), [aiPrompt]);

  function save() {
    if (!title && !body) return;
    const id = `p${Date.now()}`;
    setPosts((prev) => [
      ...prev,
      {
        id,
        title: title || 'Untitled',
        body,
        platform,
        status: 'drafting',
        createdAt: new Date().toISOString(),
        brandScore: check.score,
      },
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    setTitle('');
    setBody('');
  }

  return (
    <>
      <PageHeader
        title="Studio"
        subtitle="Compose once, ship everywhere. Brand Guardrails run inline as you type."
        actions={
          <Button onClick={save}>
            <Save className="h-4 w-4" /> {saved ? 'Saved' : 'Save draft'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(Object.keys(PLATFORM_META) as Platform[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  platform === p
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                    : 'border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)]'
                }`}
              >
                {PLATFORM_META[p].label}
              </button>
            ))}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (internal)"
            className="mb-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Write your ${meta.label} post…`}
            rows={12}
            className="w-full resize-y rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm leading-relaxed outline-none focus:border-[var(--color-accent)]"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-fg-muted)]">
            <div className="flex gap-3">
              <span>
                {body.length} / {meta.limit} chars
              </span>
              <span>{body.trim().split(/\s+/).filter(Boolean).length} words</span>
              <span>FK readability: {fk}</span>
            </div>
            <div>
              {body.length > meta.limit ? (
                <Pill tone="bad">over limit</Pill>
              ) : body.length > meta.limit * 0.9 ? (
                <Pill tone="warn">near limit</Pill>
              ) : (
                <Pill tone="good">within limit</Pill>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Brand Guardrails</h3>
              <span className="text-2xl font-bold tabular-nums">
                {check.score}
                <span className="text-sm text-[var(--color-fg-muted)]">/100</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-elev)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${check.score}%`,
                  background:
                    check.score > 80
                      ? 'var(--color-good)'
                      : check.score > 60
                        ? 'var(--color-warn)'
                        : 'var(--color-bad)',
                }}
              />
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              {check.issues.length === 0 ? (
                <div className="text-[var(--color-good)]">All clear. Ship it.</div>
              ) : (
                check.issues.map((iss, i) => (
                  <div key={i} className="flex gap-2 text-[var(--color-fg-muted)]">
                    <span className="text-[var(--color-bad)]">●</span>
                    {iss.message}
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-[var(--color-accent)]" />
              <h3 className="font-semibold">AI Caption Generator</h3>
            </div>
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="What's the post about?"
              className="mb-2 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-xs outline-none focus:border-[var(--color-accent)]"
            />
            <div className="space-y-1.5">
              {variants.length === 0 && (
                <div className="text-xs text-[var(--color-fg-muted)]">
                  Type a prompt to generate 5 brand-aware variants.
                </div>
              )}
              {variants.map((v, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setBody(v)}
                  className="block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-2 text-left text-xs leading-relaxed text-[var(--color-fg-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-fg)]"
                >
                  {v}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
              <h3 className="font-semibold">Emoji & CTA</h3>
            </div>
            <div className="flex flex-wrap gap-1.5 text-lg">
              {['🚀', '🛡️', '✨', '📊', '🧵', '👇', '🔥', '🧠'].map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setBody((b) => b + ' ' + e)}
                  className="rounded-md border border-[var(--color-border)] px-2 hover:bg-[var(--color-bg-elev)]"
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-[var(--color-fg-muted)]">CTA suggestions:</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {['Read the full piece →', 'Reply with your take.', 'Save for later.'].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setBody((b) => b + '\n\n' + c)}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-bg-elev)]"
                >
                  {c}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent drafts</h2>
          <span className="text-xs text-[var(--color-fg-muted)]">{posts.length} total</span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {posts.slice(-6).reverse().map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
              <Pill tone={PLATFORM_META[p.platform]?.tone}>{PLATFORM_META[p.platform]?.label}</Pill>
              <div className="min-w-0 flex-1 truncate">{p.title}</div>
              {p.brandScore != null && (
                <span className="text-xs text-[var(--color-fg-muted)]">score {p.brandScore}</span>
              )}
              <Pill tone={p.status === 'published' ? 'good' : 'default'}>{p.status}</Pill>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
