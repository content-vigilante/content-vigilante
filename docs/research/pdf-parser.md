# PDF Parser Selection

**Recommendation:** Use **`unpdf`** — it ships a serverless PDF.js bundle with zero native deps, explicitly lists Bun as a supported runtime, and is actively maintained by the UnJS team.

## Comparison

| Library | Last release | Weekly DL | Bun-compatible | Maintenance | Layout-aware | Verdict |
|---|---|---|---|---|---|---|
| `unpdf` | v1.6.2 (~May 2026) | ~50k+ | Yes (explicit) | Active (UnJS) | Yes — `getDocumentProxy` + `extractText({ mergePages: false })` returns text per page; raw `getTextContent()` items expose transform matrices for layout reconstruction | **Pick this** |
| `pdf-parse` | v2.4.5 (2025, mehmet-kozan fork) | ~2M | Works via `bun add` but original package is legacy/unmaintained; the active fork is `pdf-parse` 2.x | Mixed — original abandoned, fork active | No — flattens to a single string, headings lost | Skip |
| `pdfjs-dist` | Tracks Mozilla pdf.js v5.x | ~5M | Partially — v5 needs `Promise.withResolvers` (Node ≥22 / Bun 1.1+); worker setup is awkward outside browsers | Active (Mozilla) | Yes — same low-level API as unpdf | Use only if we outgrow unpdf |
| `pdfjs-serverless` | Stable | low | Yes | Light | Yes (same as pdfjs) | Redundant — unpdf wraps it |

## Why we chose unpdf

- Pure JS, zero native bindings — Bun's incomplete Node-compat for native addons is a non-issue.
- Wraps the Mozilla pdf.js serverless build, so we get the same battle-tested extractor without the worker/canvas setup.
- `extractText` with `mergePages: false` returns `string[]` — one entry per page, exactly what we need to track section headings across the brand guide.
- Lower-level `getDocumentProxy` + `page.getTextContent()` exposes per-glyph `transform` (font size, x/y) so we can reconstruct headings by detecting font-size jumps later.
- Unicode pipeline inherits from pdf.js, which handles Italian diacritics (à, è, ò) correctly via the standard CMap tables.

## Known gotchas

- pdf.js v5 calls `Promise.withResolvers`; fine on Bun 1.3 but pin a version if we ever drop to older runtimes.
- "Layout-aware" still means *coordinates*, not semantic structure. Headings have to be inferred from font-size/position — no library gives true outline extraction unless the PDF embeds tagged structure (most brand PDFs don't).
- Standard fonts and CMaps are bundled, but very large PDFs (>50 MB) will spike memory; stream page-by-page and discard.

## Install

```sh
bun add unpdf
```

## Minimal example

```ts
import { getDocumentProxy, extractText } from "unpdf";

const buf = await Bun.file("mailchimp-style-guide.pdf").arrayBuffer();
const pdf = await getDocumentProxy(new Uint8Array(buf));
const { totalPages, text } = await extractText(pdf, { mergePages: false });

for (let i = 0; i < totalPages; i++) {
  console.log(`--- Page ${i + 1} ---`);
  console.log(text[i]);
}
```

Sources: [unjs/unpdf](https://github.com/unjs/unpdf), [pdfjs-serverless](https://github.com/johannschopplich/pdfjs-serverless), [pdf-parse npm](https://www.npmjs.com/package/pdf-parse), [PkgPulse comparison 2026](https://www.pkgpulse.com/blog/unpdf-vs-pdf-parse-vs-pdfjs-dist-pdf-parsing-extraction-nodejs-2026).
