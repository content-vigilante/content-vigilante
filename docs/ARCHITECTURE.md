# Content Vigilante — Architecture

This document captures the technical design of Content Vigilante. Living document; updated as the system evolves.

## Goals

1. **Audit content against brand guidelines.** Score it, flag deviations, suggest rewrites.
2. **Local-first.** Content never leaves the user's machine without explicit consent.
3. **Multilingual.** EN + IT in v0.1, FR + DE later.
4. **Provider-agnostic.** Works with Anthropic, OpenAI, or local Ollama.
5. **Trustworthy.** Every score reports multi-judge variance so users know when to trust it.

## Non-goals (v0.1)

- Generating content (we audit, we don't write).
- Replacing human editors. We surface issues; humans decide.
- Hosting user data. No accounts, no cloud storage in core.

## High-level flow

```
INPUT (paste/URL) ──▶ EXTRACT ──▶ AUDIT ──▶ REPORT
                          │
                          ▼
                    BRAND GUIDE
                  (loaded once, cached)
```

## Core API contract

`@content-vigilante/core` exports three functions:

```typescript
loadGuide({ type, path }): Promise<BrandGuide>
extractContent({ type, value }): Promise<{ text, language }>
audit({ content, contentLanguage, guide, llm }): Promise<AuditResult>
```

That's the entire public API for v0.1. Both the CLI and the web UI call the same three functions.

## Component breakdown

### Extractors (`packages/core/src/extractors/`)

| Type | Library | Notes |
|------|---------|-------|
| `text` | none | Pass-through with line normalization |
| `url` | `@mozilla/readability` + `playwright` (optional) | Tries fetch + readability first; falls back to Playwright for JS-heavy pages |
| `pdf` (v0.2) | `unpdf` | Pure JS, works in Bun |
| `docx` (v0.2) | `mammoth` | Standard |
| `figma` (v0.3) | Figma Plugin API | Lives in the plugin package, exports text via plugin bridge |

Each extractor returns `{ text, language }`. Language is detected via [`franc`](https://github.com/wooorm/franc).

### Brand guide ingestion (`packages/core/src/guides/`)

| Type | Approach |
|------|----------|
| `pdf` | Parse with `unpdf`, chunk by section heading, embed each chunk |
| `markdown` | Parse with `remark`, chunk by heading, embed each chunk |
| `url` (v0.2) | Same as URL content extractor, then markdown path |
| `yaml` (v0.2) | Structured rules, no embeddings needed (deterministic lookup) |

Embeddings are stored in `sqlite-vec` (file-based, no infra). Embedding model defaults to `bge-m3` via Ollama (multilingual, free) but configurable to OpenAI `text-embedding-3-small`.

### Judges (`packages/core/src/judges/`)

Three independent judges, run in parallel:

#### Tone judge (LLM)

```
content + relevant tone rules (RAG)
        │
        ▼
3 LLMs in parallel (claude-sonnet, gpt-4o-mini, llama-3.3-70b)
        │
        ▼
median score + variance + union of flagged lines
```

Variance < 0.15 = high confidence. Variance ≥ 0.15 = low confidence (surfaced in UI).

#### Vocabulary judge (hybrid)

Two passes:

1. **Deterministic.** Exact-match prohibited terms from the guide. Fast. Zero false negatives on listed terms.
2. **Semantic.** LLM call to catch off-brand metaphors, corporate jargon, off-tone vocabulary the deterministic pass missed.

#### Structure judge (deterministic)

No LLM. Computes:
- Sentence length distribution
- Reading grade (Flesch-Kincaid for EN, [Gulpease](https://it.wikipedia.org/wiki/Indice_Gulpease) for IT)
- Passive voice ratio
- Paragraph length variance

Compares against guide thresholds.

### Aggregator (`packages/core/src/judges/aggregator.ts`)

Merges judge outputs into a single `AuditResult`:

- Overall score = weighted mean of dimension scores (default: tone 40%, vocab 25%, structure 20%, readability 15%; configurable per guide)
- Issues are deduplicated by line range
- Each issue carries the rule ID it violated for traceability

## Data flow with shadow paths

```
extractContent(url)
   │
   ├── happy:  fetch → readability → text
   ├── 403:    fallback to playwright if installed; else throw URLFetchError
   ├── empty:  throw EmptyContentError
   └── lang:   detect; if not supported, throw UnsupportedLanguageError

loadGuide(pdf)
   │
   ├── happy:    parse → chunk → embed → store
   ├── encrypted: throw GuideEncryptedError
   ├── scanned:  detect missing text layer → throw with OCR suggestion
   └── empty:    throw EmptyGuideError

audit(input)
   │
   ├── happy:    3 judges parallel → aggregate → return
   ├── llm-fail: retry once w/ backoff → fallback provider
   ├── timeout:  partial result, warn on missing dimension
   ├── budget:   chunk content if > 8k tokens, audit each chunk
   └── empty:    return zero-score result with explanation
```

Every error has a name. Every unhappy path has a test.

## Eval methodology

See `packages/eval/README.md` for the full methodology. Summary:

- 30 hand-labeled cases per language
- Each case = `(content, guide, expectedScoreRange, mustFlag[], mustNotFlag[])`
- Runner reports per-judge precision, recall, F1
- CI fails on >5% F1 regression vs `eval/baselines/` snapshots

## Provider abstraction

`LLMProvider` interface:

```typescript
interface LLMProvider {
  name: string;
  generate(opts: GenerateOptions): Promise<GenerateResult>;
}
```

Three built-in implementations: Anthropic, OpenAI, Ollama. All wrap the [Vercel AI SDK](https://sdk.vercel.ai). Adding a new provider is < 30 lines.

## Storage

| What | Where |
|------|-------|
| Brand guide embeddings | `~/.content-vigilante/guides/{slug}.sqlite` |
| Audit history (CLI) | `./.cv-history.jsonl` (opt-in, current dir) |
| Web UI session state | Browser only (sessionStorage) |
| Eval baselines | `packages/eval/baselines/` (committed to repo) |

## Distribution

| Artifact | Channel | Trigger |
|----------|---------|---------|
| `@content-vigilante/cli` | npm | `git tag v*` → release workflow |
| `cv` macOS binary | Homebrew tap (`content-vigilante/homebrew-cv`) | npm publish hook |
| Docker image (v0.2) | `ghcr.io/content-vigilante/cv` | `git tag v*` |
| Hosted demo | Vercel (`contentvigilante.com`) | `main` branch deploys |
| Figma plugin (v0.3) | Figma Community | manual publish |

## Open questions

- Multilingual embeddings: `bge-m3` (Ollama) vs OpenAI `text-embedding-3-small`. Decide via eval F1 in week 1.
- Should the web UI ship with anonymous telemetry (audit count only)? Default off; opt-in panel in settings.
- For URL extraction, ship Playwright as optional peer dep or always bundled? Bundle size vs cold-install friction tradeoff.
