/**
 * EmbeddingProvider — symmetric to LLMProvider.
 *
 * Concrete impls live in ./ollama.ts and ./openai.ts.
 * See docs/research/embeddings.md for the rationale on bge-m3 as default.
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
  ollamaModel?: string;
  openAIApiKey?: string;
  openAIModel?: string;
  /** Force a specific provider. Useful for tests and CI. */
  prefer?: 'ollama' | 'openai';
}

/**
 * Auto-select an embedding provider based on the user's environment.
 *
 *   1. If `prefer` is set, honor it unconditionally.
 *   2. Else if Ollama is reachable (3s probe), use it.
 *   3. Else if OPENAI_API_KEY is set in env or opts, use OpenAI.
 *   4. Else throw with install instructions.
 */
export async function resolveEmbeddingProvider(
  opts: ResolveEmbeddingProviderOptions = {},
): Promise<EmbeddingProvider> {
  const { createOllamaEmbeddingProvider, isOllamaAvailable } = await import('./ollama.ts');
  const { createOpenAIEmbeddingProvider } = await import('./openai.ts');

  if (opts.prefer === 'ollama') {
    return createOllamaEmbeddingProvider({
      ...(opts.ollamaBaseURL ? { baseURL: opts.ollamaBaseURL } : {}),
      ...(opts.ollamaModel ? { model: opts.ollamaModel } : {}),
    });
  }
  if (opts.prefer === 'openai') {
    return createOpenAIEmbeddingProvider({
      ...(opts.openAIApiKey ? { apiKey: opts.openAIApiKey } : {}),
      ...(opts.openAIModel ? { model: opts.openAIModel } : {}),
    });
  }

  if (
    await isOllamaAvailable({
      ...(opts.ollamaBaseURL ? { baseURL: opts.ollamaBaseURL } : {}),
      ...(opts.ollamaModel ? { model: opts.ollamaModel } : {}),
    })
  ) {
    return createOllamaEmbeddingProvider({
      ...(opts.ollamaBaseURL ? { baseURL: opts.ollamaBaseURL } : {}),
      ...(opts.ollamaModel ? { model: opts.ollamaModel } : {}),
    });
  }

  const apiKey = opts.openAIApiKey ?? process.env['OPENAI_API_KEY'];
  if (apiKey) {
    return createOpenAIEmbeddingProvider({
      apiKey,
      ...(opts.openAIModel ? { model: opts.openAIModel } : {}),
    });
  }

  throw new Error(
    'No embedding provider available. Install Ollama (https://ollama.com) and run `ollama pull bge-m3`, or set OPENAI_API_KEY in your env.',
  );
}
