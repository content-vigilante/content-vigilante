# @content-vigilante/web

Next.js 15 + React 19 + Tailwind CSS 4 web UI for [Content Vigilante](https://github.com/content-vigilante/Content-Vigilante).

## Local development

```bash
# from repo root
bun install
bun run --filter @content-vigilante/web dev
# → http://localhost:3000
```

## Pages

- `/` — Landing page with overview and CTAs
- `/audit` — Main audit UI (paste content, configure provider, see report)

## API routes

- `POST /api/audit` — Server-side `audit()` call. Body: `{ content, provider, apiKey?, model? }`. Returns `AuditResult`. Provider keys are not stored — they're forwarded to the chosen LLM provider for the duration of the request only. Text language is detected automatically; English uses the bundled Mailchimp guide and Italian uses the bundled Designers Italia guide.

## Deploy to Vercel

The repo is a Bun workspaces monorepo. Vercel needs:
- Root directory: `packages/web`
- Build command: `cd ../.. && bun install --frozen-lockfile && bun run --filter @content-vigilante/web build` (set in `vercel.json`)
- Framework preset: Next.js
- Node version: ≥ 20

Connect the repo at https://vercel.com/new and Vercel auto-detects the rest.

## Status

Pre-alpha. Functional v0.1 audit flow with the bundled Mailchimp guide. Custom guide upload and persistent history land in v0.2.
