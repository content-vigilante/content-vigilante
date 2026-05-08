import { embed, embedMany } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import type { EmbeddingProvider } from './provider.ts';

export interface OllamaEmbeddingOptions {
  baseURL?: string;
  model?: string;
  dimensions?: number;
}

const DEFAULT_MODEL = 'bge-m3';
const DEFAULT_DIMENSIONS = 1024;
const DEFAULT_BASE_URL = 'http://localhost:11434/api';

/**
 * Ollama embedding provider — default for v0.1.
 *
 * - Free, runs entirely on the user's machine.
 * - bge-m3 is BAAI's multilingual model (1024-dim, MIT, MIRACL nDCG ~67.8).
 * - User must have Ollama running and `ollama pull bge-m3` done once.
 *
 * Talks to Ollama's OpenAI-compatible /embed endpoint via the
 * ollama-ai-provider package + Vercel AI SDK.
 */
export function createOllamaEmbeddingProvider(
  opts: OllamaEmbeddingOptions = {},
): EmbeddingProvider {
  const model = opts.model ?? DEFAULT_MODEL;
  const dimensions = opts.dimensions ?? DEFAULT_DIMENSIONS;
  const ollama = createOllama({ baseURL: opts.baseURL ?? DEFAULT_BASE_URL });

  return {
    id: `ollama:${model}`,
    dimensions,
    maxBatchSize: 32,
    async embed(texts: string[]): Promise<Float32Array[]> {
      if (texts.length === 0) return [];
      if (texts.length === 1) {
        const first = texts[0] ?? '';
        const { embedding } = await embed({
          model: ollama.embedding(model),
          value: first,
        });
        return [new Float32Array(embedding)];
      }
      const { embeddings } = await embedMany({
        model: ollama.embedding(model),
        values: texts,
      });
      return embeddings.map((e) => new Float32Array(e));
    },
  };
}

/**
 * Probe whether Ollama is reachable and the bge-m3 model is available.
 * Returns true if a single test embed succeeds within the timeout.
 */
export async function isOllamaAvailable(opts: OllamaEmbeddingOptions = {}): Promise<boolean> {
  try {
    const provider = createOllamaEmbeddingProvider(opts);
    await Promise.race([
      provider.embed(['test']),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    return true;
  } catch {
    return false;
  }
}
