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

import { judgeTone } from './judges/tone.ts';
import type { AuditInput, AuditResult, BrandGuide, Language } from './types.ts';

/**
 * Audit content against a brand guide.
 *
 * v0.1 implementation: tone judge only (vocab + structure judges land
 * week 1 day 4). Aggregator weights tone at 100% until they're online.
 *
 * Multi-judge variance, embeddings-based RAG retrieval, and provider
 * cascading land in week 1 day 5.
 */
export async function audit(input: AuditInput): Promise<AuditResult> {
  const start = Date.now();
  const tone = await judgeTone({
    content: input.content,
    guide: input.guide,
    llm: input.llm,
  });

  return {
    score: tone.score,
    dimensions: {
      tone: tone.score,
      vocabulary: 0,
      structure: 0,
      readability: 0,
    },
    issues: tone.issues,
    strengths: [],
    metadata: {
      judgeAgreement: 1,
      tokensUsed: 0,
      durationMs: Date.now() - start,
    },
  };
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

export async function extractContent(_source: {
  type: 'text' | 'url';
  value: string;
}): Promise<{ text: string; language: Language }> {
  throw new Error('extractContent is not yet implemented (lands week 1 day 3)');
}
