/**
 * Public types for @content-vigilante/core.
 * Stable surface — anything not exported here is internal.
 */

export type Language = 'en' | 'it';

export type IssueType = 'tone' | 'vocabulary' | 'structure' | 'readability';

export type Severity = 'high' | 'medium' | 'low';

export interface Issue {
  /** 1-indexed line number in the original content. */
  line: number;
  type: IssueType;
  severity: Severity;
  /** The exact passage that triggered the issue. */
  text: string;
  /** The brand rule the passage violated, in plain English. */
  rule: string;
  /** A suggested rewrite that would resolve the issue. */
  suggestion: string;
}

export interface DimensionScores {
  tone: number;
  vocabulary: number;
  structure: number;
  readability: number;
}

export interface AuditResult {
  /** Overall voice match, 0-100. */
  score: number;
  dimensions: DimensionScores;
  issues: Issue[];
  strengths: string[];
  metadata: {
    /** 0-1, where 1 means all judges agreed perfectly. */
    judgeAgreement: number;
    tokensUsed: number;
    durationMs: number;
  };
}

export interface BrandRule {
  id: string;
  category: IssueType;
  description: string;
  examples?: {
    good?: string[];
    bad?: string[];
  };
}

export interface BrandGuide {
  /** Slug or label identifying this guide. */
  source: string;
  language: Language;
  rules: BrandRule[];
  /** The full text of the guide, for retrieval contexts. */
  rawText: string;
}

export interface AuditInput {
  content: string;
  contentLanguage: Language;
  guide: BrandGuide;
  llm: LLMProvider;
}

// ---- LLM ----

export interface GenerateOptions {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateResult {
  text: string;
  tokensUsed: number;
}

export interface LLMProvider {
  /** Identifier for this provider, e.g. "anthropic:claude-sonnet-4-6". */
  readonly name: string;
  generate(opts: GenerateOptions): Promise<GenerateResult>;
}

// ---- Errors ----

export class ContentVigilanteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class URLFetchError extends ContentVigilanteError {}
export class EmptyContentError extends ContentVigilanteError {}
export class UnsupportedLanguageError extends ContentVigilanteError {}
export class GuideEncryptedError extends ContentVigilanteError {}
export class EmptyGuideError extends ContentVigilanteError {}
export class LLMTimeoutError extends ContentVigilanteError {}
