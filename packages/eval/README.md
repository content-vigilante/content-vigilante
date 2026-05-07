# @content-vigilante/eval

The eval suite. Public, hand-labeled, regression-tested in CI.

## What it does

Every prompt change is run against this suite. CI fails if F1 drops by more than 5% from the committed baseline.

This is the credibility layer. Anyone can read the cases and judge whether the system actually does what we say it does.

## Structure

```
cases/
├── en/
│   ├── 001-tone-throat-clearing.json
│   ├── 002-vocab-corporate-jargon.json
│   └── ... (30 cases for v0.1)
└── it/
    └── ... (30 cases for v0.1)
baselines/
├── en.json   # committed F1 snapshot per dimension
└── it.json
src/
└── runner.ts # eval runner
```

## Case format

```json
{
  "id": "en-001",
  "guide": "mailchimp",
  "language": "en",
  "content": "We are pleased to announce the launch...",
  "expected": {
    "scoreRange": [40, 65],
    "mustFlag": [
      { "lineContains": "pleased to announce", "type": "tone" }
    ],
    "mustNotFlag": [
      { "lineContains": "launch of our new" }
    ]
  }
}
```

## Running locally

```bash
bun run eval                  # runs all cases, prints F1
bun run eval -- --filter en   # only English
bun run eval:baseline         # writes a new baseline (only for trusted prompt changes)
```

## Methodology

- Each case is hand-labeled by a human annotator (currently the maintainer; second annotator joining before launch).
- "Must flag" and "must not flag" assertions are concrete enough to score automatically.
- Score range is wide enough to absorb LLM stochasticity but narrow enough to catch regressions.
- We **do not** use LLM-as-a-judge for grading the eval (that would be circular). Annotations are deterministic string + line checks.
