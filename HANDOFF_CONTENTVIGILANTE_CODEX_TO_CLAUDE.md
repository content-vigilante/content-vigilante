# Claude Code Handoff

This repo is Content Vigilante, a Bun/TypeScript monorepo for auditing content against brand voice guides.

## Current State

- Branch: `main`
- Remote: `https://github.com/content-vigilante/Content-Vigilante`
- Package manager/runtime: Bun
- Workspaces: `packages/core`, `packages/cli`, `packages/eval`, `packages/web`
- The working tree already contains substantial in-progress changes from a previous Claude Code session plus Codex cleanup. Do not revert unrelated changes.

## What Codex Did

1. Installed and linked missing workspace dependencies with `bun install`.
2. Fixed Biome formatting/import order across the in-progress files.
3. Fixed lint issues:
   - Removed `any` casts in extractor tests and URL extraction.
   - Added `htmlFor`/`id` pairs for web form labels.
   - Replaced an array index React key in `Report.tsx`.
4. Fixed web TypeScript config:
   - Added `allowImportingTsExtensions` so the web package can consume the core package's existing `.ts` imports.
5. Fixed Next build config:
   - Converted `packages/web/postcss.config.js` to ESM because `packages/web/package.json` uses `"type": "module"`.
   - Moved `typedRoutes` out of `experimental` in `next.config.ts`.
6. Prevented Next from importing Bun-only SQLite code during web builds:
   - Removed `GuideStore` exports from the core root barrel in `packages/core/src/index.ts`.
   - Added core subpath exports for `./extractors/text`, `./guides`, `./guides/loadFromJSON`, and `./judges/aggregator`.
   - Updated `packages/web/app/api/audit/route.ts` to import only the guide, aggregator, LLM, and type modules it needs.
7. Replaced the placeholder `cv serve` command:
   - It now finds `packages/web`.
   - It starts the Next dev server with `bun run dev -- --hostname <host> --port <port>`.
   - It supports `cv serve --port 4000 --host 0.0.0.0`.
8. Added language detection to the web audit route:
   - English content uses the bundled Mailchimp guide.
   - Italian content uses the bundled Designers Italia guide.
9. Added `*.tsbuildinfo` to `.gitignore`.

## Verification Commands

These passed after the changes:

```bash
bun test
bun run lint
bun run typecheck
bun run build
```

## Important Notes

- `@content-vigilante/core` root export is intended to stay small. The architecture doc says the v0.1 public API is `loadGuide`, `extractContent`, and `audit`. Avoid exporting Bun-only store code from the root barrel because Next imports the root in web/server contexts.
- The SQLite vector store still exists at `packages/core/src/store/sqlite-vec.ts` and tests import it directly.
- URL extraction has an optional Playwright fallback. Do not make Playwright a required dependency unless you intentionally accept the install size.
- The web API currently audits pasted content against bundled guides only. Custom guide upload/history are still future work.
- The web API detects English and Italian text before calling the aggregator.

## Suggested Next Steps

1. Wire custom guide selection/upload for the web UI.
2. Add smoke tests for CLI commands (`cv init`, `cv audit --json`, `cv serve` startup).
3. Add a small API route test for English vs Italian guide selection.
4. Once stable, commit the current slice before adding larger product changes.
