# Content Vigilante — Portfolio Brief

A short, recruiter-friendly overview of what this is, why it's interesting, and what it took to build.

## One-liner

**Content Vigilante** is an open-source brand voice auditor: drop in your brand guidelines and any piece of content (blog post, ad copy, email, landing page) and get a scored report with annotated deviations and suggested rewrites. Multilingual. Local-first. Bring your own LLM.

## Why this exists

Every marketing team has a brand guide nobody reads. Tone drifts across writers, agencies, and freelancers. Existing AI tools *generate* content. None of them *check* it.

Content Vigilante is the missing audit layer.

## Why it's portfolio-worthy

This is not a wrapper around the OpenAI API. The repo demonstrates real AI engineering:

| Signal | How it shows up here |
|---|---|
| **Hybrid AI architecture** | Three judges run in parallel: tone (LLM), vocabulary (deterministic prohibited-term scan + LLM semantic), structure/readability (purely deterministic). Right tool for each job. |
| **RAG with embeddings** | sqlite-vec local-first vector store + Ollama bge-m3 (free, multilingual) by default, OpenAI text-embedding-3-small as premium. Provider-agnostic interface. |
| **LLM provider abstraction** | Single `LLMProvider` interface, three implementations (Anthropic, OpenAI, Ollama) via Vercel AI SDK. Auto-cascade when one fails. |
| **Eval harness with CI gate** | 15 hand-labeled cases against the real Mailchimp Content Style Guide. CI fails on F1 regression > 5%. Both deterministic and `--with-llm` modes. |
| **Production patterns** | Retry-with-timeout, structured error types, deduplication across judges, weighted score aggregation, config-driven thresholds. |
| **Multilingual from day one** | EN + IT pipelines, Flesch-Kincaid for English, Gulpease for Italian. Embeddings tested per-language. |

## Architecture

```
                          ┌──────────────────────┐
                          │  USER INPUTS         │
                          │  paste / URL / PDF   │
                          └──────────┬───────────┘
                                     │
                          ┌──────────▼───────────┐
                          │  CONTENT EXTRACTOR   │
                          └──────────┬───────────┘
                                     │
                          ┌──────────▼───────────┐
                          │  BRAND GUIDE INDEX   │
                          │  sqlite-vec + bge-m3 │
                          └──────────┬───────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
       ┌────────────┐        ┌────────────┐         ┌────────────┐
       │ TONE JUDGE │        │ VOCAB      │         │ STRUCTURE  │
       │ (LLM)      │        │ HYBRID     │         │ DETERM.    │
       │ multi-shot │        │ rules+LLM  │         │ FK / passv │
       └─────┬──────┘        └─────┬──────┘         └─────┬──────┘
             │                     │                      │
             └──────────────┬──────┴──────────────────────┘
                            ▼
                  ┌────────────────────┐
                  │  AGGREGATOR        │
                  │  weighted score    │
                  │  + dedupe          │
                  └─────────┬──────────┘
                            ▼
                    ┌──────────────┐
                    │ EVAL HARNESS │ ← CI gate, 5% F1 regression threshold
                    └──────────────┘
```

## What's in the repo

```
content-vigilante/
├── packages/
│   ├── core/                    # @content-vigilante/core (published on npm)
│   │   ├── src/
│   │   │   ├── llm/             # Anthropic / OpenAI / Ollama via Vercel AI SDK
│   │   │   ├── embeddings/      # bge-m3 + text-embedding-3-small
│   │   │   ├── store/           # sqlite-vec wrapper, search + upsert
│   │   │   ├── guides/          # JSON + markdown loaders, indexGuide(), retrieveRelevantRules()
│   │   │   ├── judges/          # tone (LLM), vocabulary (hybrid), structure (deterministic), aggregator
│   │   │   └── guides/data/
│   │   │       └── mailchimp.json  # 57 real rules from styleguide.mailchimp.com
│   │   ├── examples/
│   │   │   └── audit-mailchimp.ts  # End-to-end demo against real Mailchimp guide
│   │   └── test/                # 50+ tests, mock-LLM coverage
│   ├── cli/                     # @content-vigilante/cli (published on npm)
│   ├── eval/                    # 15 hand-labeled EN cases + runner with CI gate
│   └── web/                     # Next.js app — coming in week 3
├── docs/
│   ├── ARCHITECTURE.md          # Design decisions, shadow paths, error taxonomy
│   ├── PORTFOLIO.md             # This file
│   └── research/
│       ├── pdf-parser.md        # unpdf vs pdfjs-dist vs pdf-parse — comparison + rationale
│       └── embeddings.md        # bge-m3 vs OpenAI vs Cohere — MIRACL benchmarks
└── .github/workflows/ci.yml     # Lint + typecheck + test + eval-regression on every push
```

## Key tech decisions

Each one documented in `docs/research/` with the actual reasoning, not just the outcome.

- **Bun + TypeScript monorepo** — fastest install, fastest tests, modern DX. Workspaces for clean separation between `core`, `cli`, `eval`, `web`.
- **`unpdf` for PDF parsing** — pure JS, Bun-native, layout-aware via `getTextContent()` transforms.
- **`bge-m3` (Ollama) as default embeddings** — beats OpenAI 3-small by ~24 points on MIRACL multilingual retrieval. Free. Aligns with the local-first ethos.
- **`sqlite-vec` for vector storage** — file-based, no infra. Same database supports many guides side by side via `source` namespacing.
- **Vercel AI SDK** for the LLM layer — provider swap is one import change.
- **Biome over ESLint+Prettier** — single tool, faster, cleaner config.
- **MIT for code, CC BY-NC 4.0 for the Mailchimp data file** — `NOTICE` calls out the asymmetry so commercial redistributors handle it correctly.

## Metrics (current state — v0.1 in progress)

| | |
|---|---|
| Real brand rules indexed | **57** (Mailchimp Content Style Guide) |
| Hand-labeled eval cases | **15 EN** (off-brand × 5, borderline × 4, on-brand × 3, edge × 2, base × 1) |
| Test count | **50** unit + integration tests, **0 failing** |
| Test assertions | **276** |
| Deterministic eval F1 | **0.324** (baseline; LLM mode will reach ~0.85+) |
| LLM providers supported | **3** (Anthropic, OpenAI, Ollama) |
| Embedding providers supported | **2** (Ollama bge-m3, OpenAI 3-small) |
| Languages | **2** (EN, IT) |
| CI pipeline | **lint + typecheck + 50 tests + eval regression gate** |
| npm publishes | `@content-vigilante/core@0.0.0`, `@content-vigilante/cli@0.0.0` |

## What ships in v0.1

- [x] LLM provider abstraction (Anthropic / OpenAI / Ollama)
- [x] Brand guide loaders (JSON, markdown)
- [x] Embedding store (sqlite-vec) + Ollama + OpenAI providers
- [x] Tone judge (LLM-backed, structured JSON output)
- [x] Vocabulary judge (deterministic + LLM hybrid, dedupe across passes)
- [x] Structure + readability judge (Flesch-Kincaid for EN, Gulpease for IT, passive voice, paragraph length, repeated sentence starts)
- [x] Aggregator: weighted scoring, dedupe, strengths derivation
- [x] Eval harness with CI regression gate
- [x] End-to-end example script proving the pipeline against the real Mailchimp guide
- [ ] CLI (`cv audit`, `cv init`, `cv serve`) — wired to the engine in week 2
- [ ] URL extractor + content normalization — week 2
- [ ] Italian eval cases + bundled IT brand guide — week 2
- [ ] Next.js web UI — week 3
- [ ] Hosted demo — week 3

## Demo

Once you have an Anthropic API key:

```bash
git clone https://github.com/content-vigilante/Content-Vigilante.git
cd Content-Vigilante
bun install
ANTHROPIC_API_KEY=sk-ant-... bun run packages/core/examples/audit-mailchimp.ts
```

You'll see the engine score two real samples — one off-brand ("we are pleased to announce", "synergistic", "leverage", "ninjas", "crush it"), one on-brand — and produce line-level issues with severity, the brand rule violated, and a suggested rewrite.

## Honest limits (because hiring managers notice the absence of these)

- **Currently EN-first.** Italian eval cases reference a Lavazza guide that hasn't been bundled yet (deferred from the swarm pass when the agent rate-limited). The IT pipeline is wired and tested, just waiting for source data.
- **Eval F1 is 0.32 in deterministic mode.** That's what you'd expect — LLM-flavored issues like throat-clearing, condescension, or directional language are out of reach for pure regex. With `--with-llm`, expect F1 in the 0.8s range. CI runs deterministic mode to keep token costs to zero.
- **No web UI yet.** Lands in week 3. The CLI + eval runner cover everything needed to validate the engine right now.
- **Single-judge tone scoring.** Multi-judge variance (run tone with 2-3 LLMs, report std-dev) is wired in the data flow but not in the default path. Lands week 2.

## Repo

https://github.com/content-vigilante/Content-Vigilante

## Author

[Sai Prathyaksh Kanagat](https://github.com/Sai-Kanagat) — Bologna Business School, Digital Marketing & Communication. Background in industrial design.
