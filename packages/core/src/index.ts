/**
 * @content-vigilante/core
 *
 * Public entrypoint. Three functions form the entire v0.1 surface:
 *
 *   - loadGuide()       — ingest a brand guide (PDF or markdown) → BrandGuide
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

export { judgeTone } from './judges/tone.ts';

// Top-level convenience APIs land in week 1 days 3-5 as the
// extractor / guide / aggregator pipelines come online. Stubs below
// document the v0.1 contract so consumers can code against it now.

import { judgeTone } from './judges/tone.ts';
import type { AuditInput, AuditResult, BrandGuide, Language } from './types.ts';

export async function audit(input: AuditInput): Promise<AuditResult> {
  const start = Date.now();
  const tone = await judgeTone({
    content: input.content,
    guide: input.guide,
    llm: input.llm,
  });

  // v0.1 placeholder aggregation — vocab + structure judges land in week 1.
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

export async function loadGuide(_source: {
  type: 'pdf' | 'markdown';
  path: string;
}): Promise<BrandGuide> {
  throw new Error('loadGuide is not yet implemented (lands week 1 day 2)');
}

export async function extractContent(_source: {
  type: 'text' | 'url';
  value: string;
}): Promise<{ text: string; language: Language }> {
  throw new Error('extractContent is not yet implemented (lands week 1 day 3)');
}
