/**
 * EmbeddingProvider — symmetric to LLMProvider.
 *
 * v0.1 ships two concrete impls:
 *   - OllamaEmbeddingProvider     (default — bge-m3, free, local, multilingual)
 *   - OpenAIEmbeddingProvider     (premium — text-embedding-3-small if user has key)
 *
 * Lands week 1 day 2 alongside the brand-guide ingestion pipeline.
 * See docs/research/embeddings.md for the full rationale.
 */

export interface EmbeddingProvider {
  /** Stable identifier, e.g. "ollama:bge-m3". */
  readonly id: string;
  /** Vector dimension — used to size the sqlite-vec virtual table. */
  readonly dimensions: number;
  /** Maximum batch size in a single embed() call. */
  readonly maxBatchSize: number;
  embed(texts: string[]): Promise<Float32Array[]>;
}

export interface ResolveEmbeddingProviderOptions {
  ollamaBaseURL?: string;
  openAIApiKey?: string;
  preferLocal?: boolean;
}

/**
 * Auto-select an embedding provider based on the user's environment.
 *
 *   1. If Ollama is reachable and bge-m3 is pulled, use it.
 *   2. Else if OPENAI_API_KEY is set, use text-embedding-3-small.
 *   3. Else throw with install instructions.
 *
 * Implementation lands week 1 day 2.
 */
export async function resolveEmbeddingProvider(
  _opts: ResolveEmbeddingProviderOptions = {},
): Promise<EmbeddingProvider> {
  throw new Error('resolveEmbeddingProvider is not yet implemented (lands week 1 day 2)');
}
