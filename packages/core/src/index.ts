/**
 * @content-vigilante/core
 *
 * Public entrypoint. Three functions form the entire v0.1 surface:
 *
 *   - loadGuide()       — ingest a brand guide (JSON, markdown, or PDF) → BrandGuide
 *   - extractContent()  — extract auditable text from input (paste or URL)
 *   - audit()           — score content against a guide with the user's LLM
 *
 * Both the CLI and the web UI call these three. Nothing else is public yet.
 */

export type {
  AuditInput,
  AuditResult,
  BrandGuide,
  BrandRule,
  DimensionScores,
  GenerateOptions,
  GenerateResult,
  Issue,
  IssueType,
  Language,
  LLMProvider,
  Severity,
} from './types.ts';

export {
  ContentVigilanteError,
  EmptyContentError,
  EmptyGuideError,
  GuideEncryptedError,
  LLMTimeoutError,
  UnsupportedLanguageError,
  URLFetchError,
} from './types.ts';

export {
  createAnthropicProvider,
  createOllamaProvider,
  createOpenAIProvider,
} from './llm/index.ts';

export type { EmbeddingProvider, ResolveEmbeddingProviderOptions } from './embeddings/index.ts';
export { resolveEmbeddingProvider } from './embeddings/index.ts';

export {
  loadGuideFromJSON,
  loadGuideFromMarkdown,
  parseGuide,
  parseMarkdownGuide,
} from './guides/index.ts';

export { judgeTone } from './judges/tone.ts';
export { judgeVocabulary } from './judges/vocabulary.ts';
export { judgeStructure } from './judges/structure.ts';
export {
  runAggregator,
  DEFAULT_WEIGHTS,
  type AggregatorOptions,
  type AggregatorWeights,
} from './judges/aggregator.ts';

import { type AggregatorOptions, runAggregator } from './judges/aggregator.ts';
import type { AuditInput, AuditResult, BrandGuide, Language } from './types.ts';

/**
 * Audit content against a brand guide.
 *
 * Runs three judges in parallel — tone (LLM), vocabulary (hybrid), and
 * structure/readability (deterministic) — and returns a weighted overall
 * score plus a deduplicated, line-sorted list of issues.
 */
export async function audit(input: AuditInput, opts: AggregatorOptions = {}): Promise<AuditResult> {
  return runAggregator(input, opts);
}

/**
 * Convenience loader: dispatches to the right format-specific loader
 * based on file extension.
 *
 * Supported: `.json`, `.md`. PDF support lands week 1 day 3.
 */
export async function loadGuide(source: {
  type: 'json' | 'markdown';
  path: string;
}): Promise<BrandGuide> {
  const { loadGuideFromJSON, loadGuideFromMarkdown } = await import('./guides/index.ts');
  if (source.type === 'json') return loadGuideFromJSON(source.path);
  if (source.type === 'markdown') return loadGuideFromMarkdown(source.path);
  throw new Error(`Unsupported guide source type: ${String((source as { type: string }).type)}`);
}

export async function extractContent(source: {
  type: 'text' | 'url';
  value: string;
}): Promise<{ text: string; language: Language }> {
  const { extractContent: dispatch } = await import('./extractors/index.ts');
  return dispatch(source);
}
