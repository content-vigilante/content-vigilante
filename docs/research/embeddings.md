# Embeddings: Strategy & Provider Choice

Content Vigilante needs multilingual embeddings (EN + IT for v0.1, FR + DE later) to retrieve relevant brand-guide rules for arbitrary user content. Storage is sqlite-vec (local-first). Users bring their own LLM key, so embeddings must be optional/swappable too.

## Recommendation

- **Default: `bge-m3` via Ollama** — free, local, top-tier multilingual retrieval, no key required.
- **Premium: OpenAI `text-embedding-3-small`** — used automatically if the user has an OpenAI key configured. Cheap, fast, hosted, 1536d.

Other providers (Cohere, Voyage, OpenAI-large) are supported through the same interface but not promoted as defaults.

## Comparison

| Model | MIRACL nDCG@10 (multilingual) | Dim | Cost / 1M tokens | Local? | License |
|---|---|---|---|---|---|
| **bge-m3** (BAAI) | ~67.8 dense / 70.0 hybrid | 1024 | $0 (self-host) | Yes (Ollama, llama.cpp, HF) | MIT |
| **OpenAI text-embedding-3-small** | ~44.0 | 1536 (truncatable) | $0.02 | No | Proprietary |
| **OpenAI text-embedding-3-large** | ~54.9 | 3072 (truncatable) | $0.13 | No | Proprietary |
| **Cohere embed-multilingual-v3.0** | ~66.3 (strong on IT, ~0.86 nDCG@10 in Italian-specific eval) | 1024 | $0.10 | No | Proprietary |
| **Voyage voyage-multilingual-2** | competitive top-tier | 1024 | ~$0.12 | No | Proprietary |

(Numbers from BGE-M3 paper, OpenAI's own MIRACL update post, MTEB leaderboard, and an MDPI 2025 EN/IT IR study.)

## Why bge-m3 as default

- **Beats OpenAI 3-small by ~24 points on MIRACL.** For multilingual retrieval, OpenAI's general-purpose models lag specialized multilingual ones — the gap is not subtle.
- **Free + offline.** Runs on the user's machine via Ollama (`ollama pull bge-m3`). Aligns with the local-first ethos and lets the tool work with zero API keys.
- **Permissive (MIT).** No commercial-use friction for OSS.
- **1024-dim is sweet spot for sqlite-vec.** ~4 KB per vector at f32, ~1 KB at int8 — comfortable for tens of thousands of brand-rule chunks per user.
- **Hybrid-capable.** bge-m3 natively emits dense + sparse + multi-vector; we ship dense for v0.1 and can layer sparse/colbert-style rerank later without changing models.

## Italian-specific note

The MDPI 2025 study on EN/IT IR put Cohere `embed-multilingual-v3.0` at the top for Italian (nDCG@10 ≈ 0.86). bge-m3 is right behind it and ahead of every OpenAI model. OpenAI 3-small is noticeably weaker on Italian than on English — its training mix is English-dominant. Practical implication: do **not** default to OpenAI for IT content even if a key is present; prefer bge-m3 unless the user explicitly opts into a hosted multilingual model. We'll surface a warning in the CLI when 3-small is selected with non-English brand guides.

## Implementation sketch

Mirror the existing `LLMProvider` shape with an `EmbeddingProvider` interface:

```ts
export interface EmbeddingProvider {
  readonly id: string;          // "ollama-bge-m3" | "openai-3-small" | ...
  readonly dimensions: number;  // for sqlite-vec table creation
  readonly maxBatchSize: number;
  embed(texts: string[]): Promise<Float32Array[]>;
}
```

Concrete classes: `OllamaEmbeddingProvider` (default, talks to `http://localhost:11434/api/embed`), `OpenAIEmbeddingProvider`, `CohereEmbeddingProvider`, `VoyageEmbeddingProvider`. A `resolveEmbeddingProvider(config)` factory picks by env: Ollama if reachable, else OpenAI if `OPENAI_API_KEY`, else error with install instructions. The vector dimension is read from `provider.dimensions` when creating the sqlite-vec virtual table, so swapping providers on a fresh project Just Works; switching mid-project requires a re-embed (we'll detect dimension mismatch and prompt).

Sources:
- [BAAI/bge-m3 (Hugging Face)](https://huggingface.co/BAAI/bge-m3)
- [BGE M3-Embedding paper](https://arxiv.org/html/2402.03216v3)
- [OpenAI new embedding models (MIRACL numbers)](https://openai.com/index/new-embedding-models-and-api-updates/)
- [OpenAI API pricing](https://openai.com/api/pricing/)
- [Cohere embed-multilingual-v3.0](https://docs.cohere.com/docs/cohere-embed)
- [EN/IT IR evaluation, MDPI 2025](https://www.mdpi.com/2504-2289/9/5/141)
- [Voyage AI pricing](https://docs.voyageai.com/docs/pricing)
- [MMTEB benchmark](https://arxiv.org/html/2502.13595v4)
