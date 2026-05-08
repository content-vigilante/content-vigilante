import { openai } from '@ai-sdk/openai';
import { embed, embedMany } from 'ai';
import type { EmbeddingProvider } from './provider.ts';

export interface OpenAIEmbeddingOptions {
  apiKey?: string;
  model?: string;
  dimensions?: number;
}

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_DIMENSIONS = 1536;

/**
 * OpenAI embedding provider — premium fallback for v0.1.
 *
 * - text-embedding-3-small: $0.02 per 1M tokens, 1536d (truncatable).
 * - Lags bge-m3 on multilingual retrieval (especially Italian) per
 *   docs/research/embeddings.md. Used only when Ollama is unavailable
 *   and OPENAI_API_KEY is set.
 */
export function createOpenAIEmbeddingProvider(
  opts: OpenAIEmbeddingOptions = {},
): EmbeddingProvider {
  const model = opts.model ?? DEFAULT_MODEL;
  const dimensions = opts.dimensions ?? DEFAULT_DIMENSIONS;

  if (opts.apiKey) {
    process.env['OPENAI_API_KEY'] = opts.apiKey;
  }

  return {
    id: `openai:${model}`,
    dimensions,
    maxBatchSize: 100,
    async embed(texts: string[]): Promise<Float32Array[]> {
      if (texts.length === 0) return [];
      if (texts.length === 1) {
        const first = texts[0] ?? '';
        const { embedding } = await embed({
          model: openai.embedding(model),
          value: first,
        });
        return [new Float32Array(embedding)];
      }
      const { embeddings } = await embedMany({
        model: openai.embedding(model),
        values: texts,
      });
      return embeddings.map((e) => new Float32Array(e));
    },
  };
}
