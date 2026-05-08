export type { EmbeddingProvider, ResolveEmbeddingProviderOptions } from './provider.ts';
export { resolveEmbeddingProvider } from './provider.ts';
export { createOllamaEmbeddingProvider, isOllamaAvailable } from './ollama.ts';
export { createOpenAIEmbeddingProvider } from './openai.ts';
