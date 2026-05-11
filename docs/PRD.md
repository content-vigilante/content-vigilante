# Content Vigilante — Product Requirements Document

## Product Summary

Content Vigilante is an open-source, local-first brand voice auditor. Users provide a brand guide and a piece of content, and the system returns a scored report with line-level deviations, violated rule references, and suggested rewrites.

## Problem

Brand teams create guidelines, but those rules rarely get enforced consistently across blogs, landing pages, email, social copy, and agency deliverables. Existing AI tools generate content, but they do not reliably audit whether that content stays on-brand.

Content Vigilante is the audit layer that closes that gap.

## Vision

Make brand voice enforcement as routine as linting, testing, and CI checks.

## Core Principles

1. **Local-first** — content should stay on the user's machine unless they explicitly use an external provider.
2. **Bring your own LLM** — Anthropic, OpenAI, and Ollama are first-class.
3. **Audit before publish** — help teams catch off-brand content before it ships.
4. **Trustworthy output** — every score should be explainable with rule references and confidence signals.
5. **Open and extensible** — support new guides, providers, languages, and integrations without locking users in.

## Target Users

### Brand and content teams
- Need a fast way to review copy at scale.
- Want line-level issues instead of vague feedback.

### Freelancers and agencies
- Need to self-check deliverables before handoff.
- Need support for different client guides.

### Developers and DevOps teams
- Need a CI gate that can block off-brand content in pull requests.

## Primary Use Cases

1. Audit pasted content in the web UI.
2. Audit a local file or URL from the CLI.
3. Load a brand guide and validate it before use.
4. Fail CI when content drops below a configured threshold.
5. Review issue lists with suggestions and violated rules.

## Functional Requirements

### Current / v0.1

- Brand guide loading from JSON and markdown.
- Content extraction from pasted text and URLs.
- Automatic English and Italian language detection.
- Three-judge audit pipeline:
  - tone judge (LLM-backed)
  - vocabulary judge (deterministic + LLM hybrid)
  - structure/readability judge (deterministic)
- Aggregated overall score with dimension scores.
- Line-level issues with severity, offending text, violated rule, and suggested rewrite.
- CLI commands:
  - `cv init`
  - `cv audit`
  - `cv serve`
- Local web UI for running audits.
- CI coverage through lint, typecheck, tests, and eval regression gate.

### v0.2

- PDF content extraction.
- DOCX content extraction.
- Custom guide upload in the web UI.
- Guide persistence in `~/.content-vigilante/guides/`.
- Audit history storage.
- Italian eval expansion.
- Docker distribution.
- Homebrew distribution.

### v0.3

- Multi-judge confidence / variance reporting.
- Batch directory auditing.
- Figma plugin.
- French and German language support.
- Slack notifications.
- GitHub App integration.

### v1.0

- Side-by-side rewrite diff view.
- Guided rewrite mode.
- Content type presets.
- Score-weight calibration UI.
- Hosted demo deployment.
- Optional cloud tier with accounts, guide library, and history dashboard.
- Headless API.
- VS Code extension.
- Docs site and launch assets.

## Recommended Future Features

- Custom rule authoring UI.
- Per-guide weighting controls.
- Audit comparison between revisions.
- Translation-aware auditing.
- CLI watch mode.
- Token and provider usage reporting.
- Brand guide generator from a historical content corpus.

## Non-Goals

- Replacing human editors.
- Generating net-new marketing content as the primary workflow.
- Mandatory cloud storage or account creation for the core product.

## Success Metrics

- Fast time-to-first-audit.
- High eval precision/recall across supported languages.
- Reliable CI adoption for content repositories.
- Clear user trust signals through issue traceability and judge agreement.

## Delivery Priorities

1. Stabilize the current Phase 1 audit flow.
2. Expand extractors and guide persistence.
3. Add confidence and workflow integrations.
4. Ship product polish and optional hosted experiences.
