# @content-vigilante/core

Core engine for [Content Vigilante](https://github.com/content-vigilante/Content-Vigilante) — an open-source brand voice auditor.

> **Pre-alpha — `0.0.0`** · This is a placeholder publish to reserve the npm scope. Full v0.1 ships when the engine is complete (target: ~3 weeks).

## What this will do

```ts
import { audit, createAnthropicProvider } from '@content-vigilante/core';

const result = await audit({
  content: 'We are pleased to announce our new synergistic platform...',
  contentLanguage: 'en',
  guide: mailchimpGuide,
  llm: createAnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY }),
});

console.log(result.score);   // 64
console.log(result.issues);  // [{ line, type, severity, text, rule, suggestion }, ...]
```

## Roadmap

- [x] LLM provider abstraction (Anthropic, OpenAI, Ollama)
- [x] EmbeddingProvider interface
- [x] Tone judge skeleton with multi-shot LLM grading
- [ ] Brand guide ingestion (PDF + markdown + JSON) — week 1 day 2
- [ ] sqlite-vec embedding store — week 1 day 3
- [ ] Vocabulary judge (deterministic + LLM hybrid) — week 1 day 4
- [ ] Structure judge (deterministic) — week 1 day 4
- [ ] URL content extractor — week 2

See the [main README](https://github.com/content-vigilante/Content-Vigilante#readme) for the full architecture and roadmap.

## License

MIT for all code. The bundled `mailchimp.json` reference dataset is CC BY-NC 4.0 — see [`NOTICE`](https://github.com/content-vigilante/Content-Vigilante/blob/main/NOTICE).
