<div align="center">
<img width="1101" height="352" alt="Content Vigilante" src="https://github.com/user-attachments/assets/ec404f5a-3b65-43cb-9ae5-6a1c3e604f17" />


# Content Vigilante

**The local-first, open-source marketing operating system.**

Brand-voice auditor + content calendar + multi-platform publishing + hybrid CRM, in one workspace. Drop in your brand guide, write across LinkedIn / X / Instagram / Facebook / Newsletter with inline guardrails, schedule, publish, and report — all without giving up data sovereignty.

[![CI](https://github.com/content-vigilante/Content-Vigilante/actions/workflows/ci.yml/badge.svg)](https://github.com/content-vigilante/Content-Vigilante/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/content-vigilante/Content-Vigilante?style=social)](https://github.com/content-vigilante/Content-Vigilante)

**Live:** [content-vigilante-vercel.vercel.app](https://content-vigilante-vercel.vercel.app)

</div>

> Status: **v2.1 shipped** — context library (drop research → get post ideas), mobile-responsive dashboard, time tracker, unified inbox, exports + client approval portal, lead scoring, GA4 + LinkedIn + X integrations, cross-device sync.

## Why this exists

Every marketing team has a brand guide nobody reads. Tone drifts across writers, agencies, and freelancers. By the time the CMO notices, 50 pieces of off-brand content are live. Most tools generate content. None of them check it — let alone schedule it, publish it, and keep the brand intact across channels.

Content Vigilante is the layer in between.

## What's in the box

**Context library (v2.1)**
- Drag-and-drop PDF, Markdown, text, CSV, JSON, HTML, SRT/VTT files.
- Extracted text stays in your browser (or syncs across devices via Vercel KV).
- **Suggest 5 post ideas** button feeds context + brand guide + goal into your own LLM and returns structured, source-attributed drafts.
- One click hands a draft to Studio with brand-guardrail check applied.

**Brand Guardrails — the Vigilante core**
- Hybrid AI judges: tone (LLM) · vocabulary (deterministic + LLM) · structure & readability (deterministic).
- Multilingual: EN + IT in v0.1; FR + DE queued.
- BYO LLM (Anthropic, OpenAI, or local Ollama) — keys never leave your browser session.
- **PDF guide ingestion** — drop a PDF, get a structured rule set wired into the audit pipeline.

**Studio**
- Multi-platform composer (LinkedIn, IG, X, FB, Newsletter) with character & readability counters.
- Inline brand-score (live as you type), forbidden-term flags, FK readability.
- AI caption generator — 5 brand-aware variants per prompt, routed through your own provider.
- One-click publish to LinkedIn and X (OAuth wired).

**Calendar**
- Drag-and-drop weekly grid across all channels.
- **Publish-due** action runs your scheduled queue through real platform APIs.

**Pipeline**
- Hybrid CRM. Content kanban (Idea → Drafting → Scheduled → Published) and sales pipeline (Lead → Discovery → Proposal → Closed) side-by-side.

**Analytics**
- KPI cards, correlation engine, best-time heatmap, ROI calculator.
- **Live GA4** when the integration is configured; falls back to sample data.

**System**
- Cross-device sync via Vercel KV (in-memory fallback for dev).
- Workspace switcher for client / brand identities.
- Connections panel showing every integration's status and exact env vars to enable it.

## Quick start — web app

```bash
git clone https://github.com/content-vigilante/Content-Vigilante
cd Content-Vigilante
bun install
bun run --filter @content-vigilante/web dev
# → http://localhost:3000
```

Or use the live deployment: **[content-vigilante-vercel.vercel.app](https://content-vigilante-vercel.vercel.app)**.

## Quick start — CLI

```bash
npm install -g @content-vigilante/cli
cv init --guide ./brand-guidelines.pdf
cv audit ./blog-post.md
cv audit https://yoursite.com/landing-page
```

## Enabling the integrations

All integrations activate via Vercel env vars — the app surfaces "not configured" / "connect" / "connected" states automatically. Full setup walk-through in [`docs/v1.1-INTEGRATIONS.md`](docs/v1.1-INTEGRATIONS.md) and [`docs/v1.2-CHANGES.md`](docs/v1.2-CHANGES.md).

| Integration | Env vars | Activates |
|---|---|---|
| **GA4** | `GA4_CLIENT_ID`, `GA4_CLIENT_SECRET` | Live analytics on `/dashboard/analytics` |
| **LinkedIn** | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | Publish button in Studio + Calendar |
| **X (Twitter)** | `X_CLIENT_ID`, `X_CLIENT_SECRET` | Publish button for X posts (PKCE OAuth) |
| **Vercel KV** | `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Real cross-device sync (auto-injected when you create a KV store) |
| Cookie encryption | `CV_COOKIE_SECRET` | Required once any OAuth integration is enabled |

## Architecture

```
┌──────────────────────────────────────────────┐
│  USER INPUTS                                 │  text · URL · PDF · scheduled post
└──────────┬───────────────────────────────────┘
           │
┌──────────▼───────────────┐  ┌────────────────────────────┐
│  EXTRACTORS              │  │  BRAND GUIDE INDEX         │
│  text · url · pdf        │  │  bundled Mailchimp + IT    │
│                          │  │  + your uploaded PDF       │
└──────────┬───────────────┘  └────────────┬───────────────┘
           │                               │
           └───────────────┬───────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│  AGGREGATOR (3 judges in parallel)                       │
│  tone (LLM) · vocab (rules+LLM) · structure (det.)       │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│  REPORT                                                  │
│  → score · annotated issues · rewrites · multi-judge     │
│    agreement · readability                               │
└──────────────────────────────────────────────────────────┘

PUBLISH PATH                       SYNC PATH
   Studio / Calendar                   localStorage (browser)
        │                                   ↕
   /api/{linkedin,x}/publish           /api/sync (KV adapter)
        │                                   ↕
   platform APIs                       any device with token
```

Deeper: [`docs/TECHNICAL_OVERVIEW.md`](docs/TECHNICAL_OVERVIEW.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/PRD.md`](docs/PRD.md).

## Roadmap

- [x] Core audit engine — extractors, embeddings, 3 judges, aggregator
- [x] Eval runner with CI regression gate
- [x] CLI (`cv audit`, `cv init`, `cv serve`)
- [x] Italian eval cases + bundled IT guide
- [x] Next.js dashboard with Calendar / Studio / Guardrails / Analytics / Pipeline / Settings
- [x] AI caption generator wired to user's provider
- [x] PDF brand-guide ingestion
- [x] GA4 OAuth + Data API
- [x] LinkedIn OAuth + publish
- [x] X (Twitter) OAuth + publish
- [x] Cross-device sync (Vercel KV)
- [x] Vercel cron scaffold for scheduled publishing
- [x] **v2.1** — Context library (drop research → get post ideas), inbox, exports, time tracker, lead scoring, client approval portal, mobile responsive
- [ ] **v2.2** — server-driven cron publishing (migrate platform tokens to KV)
- [ ] **v2.2** — named-account auth via NextAuth (optional)
- [ ] **v2.2** — Instagram + Facebook publishing
- [ ] **v2.3** — competitor watchlist, dark social tracker, OCR for image context
- [ ] **v3.0** — Product Hunt launch

## Eval suite

Every prompt change is regression-tested against a public, hand-labeled eval suite.

- 20+ cases across EN + IT (FR + DE queued).
- Each case asserts: expected score range, lines that must be flagged, lines that must not be flagged.
- CI fails on >5% weighted-F1 regression.
- See [`packages/eval/`](packages/eval) for cases and methodology.

## Built with

- [Bun](https://bun.sh) + TypeScript monorepo
- [Next.js 15](https://nextjs.org) (App Router) + Tailwind v4
- [Vercel AI SDK](https://sdk.vercel.ai) for provider-agnostic LLM access
- [sqlite-vec](https://github.com/asg017/sqlite-vec) for local vector search
- [Biome](https://biomejs.dev) for lint + format
- Vercel KV (sync) · Vercel Cron (scheduled jobs)
- Editorial brand kit (Fraunces display + JetBrains Mono eyebrows)

## Contributing

Issues and PRs welcome. For now: **star the repo to follow along.**

## License

MIT — see [`LICENSE`](LICENSE).

---

Built by [Sai Prathyaksh Kanagat](https://github.com/Sai-Kanagat) in Bologna.
