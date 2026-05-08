import type { AuditInput, AuditResult, Issue, Severity } from '../types.ts';
import { judgeStructure } from './structure.ts';
import { judgeTone } from './tone.ts';
import { judgeVocabulary } from './vocabulary.ts';

export interface AggregatorWeights {
  tone: number;
  vocabulary: number;
  structure: number;
  readability: number;
}

export const DEFAULT_WEIGHTS: AggregatorWeights = {
  tone: 0.4,
  vocabulary: 0.25,
  structure: 0.2,
  readability: 0.15,
};

export interface AggregatorOptions {
  weights?: Partial<AggregatorWeights>;
  /** Skip the LLM-backed vocab pass (for cheap cached audits / tests). */
  skipVocabLLM?: boolean;
}

/**
 * Run all three judges in parallel, merge their issues, compute a
 * weighted overall score.
 *
 * - Tone judge:        LLM-backed, subjective.
 * - Vocabulary judge:  hybrid (deterministic prohibited-term scan + LLM semantic).
 * - Structure judge:   deterministic — sentence length, readability, passive voice.
 *
 * The structure judge contributes both `structure` and `readability`
 * dimensions, so it does double duty.
 */
export async function runAggregator(
  input: AuditInput,
  opts: AggregatorOptions = {},
): Promise<AuditResult> {
  const start = Date.now();
  const weights = { ...DEFAULT_WEIGHTS, ...opts.weights };

  const [tone, vocab] = await Promise.all([
    judgeTone({
      content: input.content,
      guide: input.guide,
      llm: input.llm,
      toneOnly: true, // vocabulary handled by its own judge now
    }),
    judgeVocabulary({
      content: input.content,
      guide: input.guide,
      llm: input.llm,
      ...(opts.skipVocabLLM ? { skipLLM: true } : {}),
    }),
  ]);

  const structure = judgeStructure({
    content: input.content,
    language: input.contentLanguage,
  });

  const dimensions = {
    tone: tone.score,
    vocabulary: vocab.score,
    structure: structure.structureScore,
    readability: structure.readabilityScore,
  };

  const overall =
    dimensions.tone * weights.tone +
    dimensions.vocabulary * weights.vocabulary +
    dimensions.structure * weights.structure +
    dimensions.readability * weights.readability;

  const issues = dedupeIssues([...tone.issues, ...vocab.issues, ...structure.issues]);

  return {
    score: Math.round(overall),
    dimensions,
    issues,
    strengths: deriveStrengths(dimensions),
    metadata: {
      judgeAgreement: 1, // single-judge for now; multi-judge variance lands when we
      // call the aggregator with a list of LLMs (week 2).
      tokensUsed: 0,
      durationMs: Date.now() - start,
    },
  };
}

function dedupeIssues(issues: Issue[]): Issue[] {
  const seen = new Map<string, Issue>();
  for (const issue of issues) {
    const key = `${issue.line}::${issue.type}::${issue.text.toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing || severityRank(issue.severity) > severityRank(existing.severity)) {
      seen.set(key, issue);
    }
  }
  return [...seen.values()].sort((a, b) => a.line - b.line);
}

function severityRank(s: Severity): number {
  if (s === 'high') return 3;
  if (s === 'medium') return 2;
  return 1;
}

function deriveStrengths(dims: {
  tone: number;
  vocabulary: number;
  structure: number;
  readability: number;
}): string[] {
  const strengths: string[] = [];
  if (dims.tone >= 90) strengths.push('Tone matches the brand voice cleanly.');
  if (dims.vocabulary >= 90) strengths.push('No flagged vocabulary issues.');
  if (dims.structure >= 90) strengths.push('Structure (sentence length, paragraphs) is clean.');
  if (dims.readability >= 90) strengths.push('Reads at a comfortable grade level.');
  return strengths;
}
