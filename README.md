<div align="center">

# Content Vigilante

**Patrols your content for off-brand violations.**

An open-source brand voice auditor. Drop in your brand guidelines and any piece of content. Get a scored report with annotated deviations and suggested rewrites. Multilingual. Local-first. Bring your own LLM.

[![CI](https://github.com/content-vigilante/Content-Vigilante/actions/workflows/ci.yml/badge.svg)](https://github.com/content-vigilante/Content-Vigilante/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/content-vigilante/Content-Vigilante?style=social)](https://github.com/content-vigilante/Content-Vigilante)

</div>

> Status: **active development**, v0.1 launch coming soon. Watch the repo to follow.

## Why this exists

Every marketing team has a brand guide nobody reads. Tone drifts across writers, agencies, and freelancers. By the time the CMO notices, 50 pieces of off-brand content are live. Existing tools generate content. None of them check it.

Content Vigilante is the missing audit layer.

## What it does

- **Voice scoring** — rates content against your guide on tone, vocabulary, structure, and readability.
- **Annotated deviations** — every flagged passage shows the rule it broke and a suggested rewrite.
- **Multilingual** — first-class support for EN and IT in v0.1. FR and DE coming in v0.2 / v0.3.
- **Local-first** — your content never leaves your machine. BYO LLM (Anthropic, OpenAI, or local Ollama).
- **CI integration** — block off-brand content at PR time.
- **Multi-judge eval** — every score includes inter-model agreement so you know when to trust it.

## Quick start

```bash
# install
npm install -g @content-vigilante/cli

# initialize with your brand guide (PDF or markdown)
cv init --guide ./brand-guidelines.pdf

# audit content
cv audit ./blog-post.md
cv audit https://yoursite.com/landing-page

# launch the local web UI
cv serve
```

## Roadmap

- [x] Repo + CI scaffolding
- [ ] v0.1 — Core engine, EN + IT, paste + URL ingestion, CLI, web UI, hosted demo, public eval suite
- [ ] v0.2 — PDF/docx audit, YAML guide DSL, Docker image, French
- [ ] v0.3 — Figma plugin, German, team brand library
- [ ] v1.0 — Full polish, docs site, Product Hunt launch

## Architecture

```
┌──────────────────────┐
│   USER INPUTS        │  paste / URL / PDF / Figma
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│   CONTENT EXTRACTOR  │  per-format parsers → normalized text
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│   BRAND GUIDE INDEX  │  pgvector / sqlite-vec, multilingual embeddings
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│   3 JUDGES           │  tone (LLM) · vocabulary (rules+LLM) · structure (deterministic)
└──────────┬───────────┘
           │
┌──────────▼───────────┐
│   AGGREGATOR         │  → score, issues, suggestions, multi-judge agreement
└──────────────────────┘
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design.

## Built with

- [Bun](https://bun.sh) + TypeScript
- [Vercel AI SDK](https://sdk.vercel.ai) (provider-agnostic LLM access)
- [Next.js 15](https://nextjs.org) + [shadcn/ui](https://ui.shadcn.com) for the web UI
- [sqlite-vec](https://github.com/asg017/sqlite-vec) for local vector search
- [Biome](https://biomejs.dev) for lint + format

## Eval suite

Every prompt change is regression-tested against a public, hand-labeled eval suite.

- 30 cases per language (EN + IT in v0.1)
- Each case asserts: expected score range, lines that must be flagged, lines that must not be flagged
- CI fails on >5% F1 regression
- See [`packages/eval/`](packages/eval) for cases and methodology

## Contributing

This is a portfolio project under active development. Issues and PRs welcome once v0.1 ships. For now, **star the repo to follow along.**

## License

MIT — see [`LICENSE`](LICENSE).

---

Built by [Sai Prathyaksh Kanagat](https://github.com/Sai-Kanagat) in Bologna.
