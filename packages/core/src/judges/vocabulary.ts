import type { BrandGuide, BrandRule, Issue, LLMProvider } from '../types.ts';

export interface VocabularyJudgeInput {
  content: string;
  guide: BrandGuide;
  llm: LLMProvider;
  /** Skip the LLM pass — useful for tests and fast paths. */
  skipLLM?: boolean;
}

export interface VocabularyJudgeResult {
  score: number;
  issues: Issue[];
  judgeName: string;
  deterministicMatches: number;
  llmIssues: number;
}

/**
 * Hybrid vocabulary judge: deterministic scan for prohibited terms in quoted
 * rule descriptions and `examples.bad`, then an LLM pass for semantic misses.
 */
export async function judgeVocabulary(input: VocabularyJudgeInput): Promise<VocabularyJudgeResult> {
  const vocabRules = input.guide.rules.filter((r) => r.category === 'vocabulary');
  const lines = input.content.split('\n');

  const deterministic: Issue[] = [];
  for (const rule of vocabRules) {
    const terms = extractProhibitedTerms(rule);
    const suggestion = rule.examples?.good?.[0] ?? '';
    for (const term of terms) {
      const re = buildWordBoundaryRegex(term);
      lines.forEach((lineText, i) => {
        let m: RegExpExecArray | null;
        while ((m = re.exec(lineText)) !== null) {
          deterministic.push({
            line: i + 1,
            type: 'vocabulary',
            severity: 'high',
            text: m[0],
            rule: rule.description,
            suggestion,
          });
        }
      });
    }
  }

  let llmIssues: Issue[] = [];
  if (!input.skipLLM && vocabRules.length > 0) {
    llmIssues = await runLLMPass(input, vocabRules);
  }

  const merged = mergeIssues(deterministic, llmIssues);
  return {
    judgeName: input.llm.name,
    score: scoreFromIssues(merged),
    issues: merged,
    deterministicMatches: deterministic.length,
    llmIssues: llmIssues.length,
  };
}

function extractProhibitedTerms(rule: BrandRule): string[] {
  const candidates = new Set<string>();
  // Quoted terms in description: "foo" or 'foo' or "smart" curly quotes.
  const quoteRe = /["“'‘]([^"”'’]{1,40})["”'’]/g;
  let m: RegExpExecArray | null;
  while ((m = quoteRe.exec(rule.description)) !== null) {
    const cleaned = stripTrailingPunctuation(m[1]?.trim() ?? '');
    if (cleaned.length > 1) candidates.add(cleaned);
  }
  for (const bad of rule.examples?.bad ?? []) {
    const quoted = bad.match(/["“'‘]([^"”'’]+)["”'’]/);
    const inner = stripTrailingPunctuation(quoted?.[1]?.trim() ?? '');
    if (inner.length > 1) candidates.add(inner);
  }

  // Filter out PRESCRIBED terms that appear in examples.good.
  // A description like `Avoid "utilize." Use "use" instead.` quotes both
  // "utilize" (prohibited) and "use" (prescribed). Match against word-bounded
  // occurrences in examples.good to drop the prescribed ones.
  const goods = (rule.examples?.good ?? []).map((g) => g.toLowerCase());
  return [...candidates].filter((term) => {
    const lower = term.toLowerCase();
    const re = new RegExp(`\\b${escapeRegex(lower)}\\b`, 'i');
    return !goods.some((g) => re.test(g));
  });
}

function stripTrailingPunctuation(s: string): string {
  return s.replace(/[.,;:!?]+$/, '');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildWordBoundaryRegex(term: string): RegExp {
  return new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi');
}

async function runLLMPass(input: VocabularyJudgeInput, rules: BrandRule[]): Promise<Issue[]> {
  const rulesBlock = rules.map((r) => `- ${r.description}`).join('\n');

  const system = `You are a brand vocabulary auditor. Only flag vocabulary issues that are NOT exact-match prohibited terms (those have already been caught deterministically). Focus on semantic vocab violations: corporate jargon used in spirit, off-brand metaphors, pretentious word choices.

Output strictly valid JSON:
{
  "issues": [
    { "line": number, "text": string, "rule": string, "suggestion": string, "severity": "high" | "medium" | "low" }
  ]
}

- "line" is 1-indexed.
- Don't repeat exact prohibited words; focus on the spirit of the rules.
- Empty issues array if nothing semantic to flag.`;

  const prompt = `Brand: ${input.guide.source}

Vocabulary rules:
${rulesBlock}

Content (line-numbered):
${numberLines(input.content)}

List semantic vocabulary deviations as JSON.`;

  const { text } = await input.llm.generate({ system, prompt, maxTokens: 1500, temperature: 0.1 });
  const parsed = parseLooseJSON(text);
  if (!Array.isArray(parsed?.issues)) return [];
  return (parsed.issues as Array<Record<string, unknown>>).map(
    (i): Issue => ({
      line: numberOr(i['line'], 0),
      type: 'vocabulary',
      severity: isSeverity(i['severity']) ? (i['severity'] as Issue['severity']) : 'medium',
      text: stringOr(i['text']),
      rule: stringOr(i['rule']),
      suggestion: stringOr(i['suggestion']),
    }),
  );
}

function mergeIssues(deterministic: Issue[], llm: Issue[]): Issue[] {
  const result = [...deterministic];
  for (const candidate of llm) {
    const overlaps = deterministic.some(
      (d) => d.line === candidate.line && spansOverlap(d.text, candidate.text),
    );
    if (!overlaps) result.push(candidate);
  }
  return result;
}

function spansOverlap(a: string, b: string): boolean {
  if (!a || !b) return false;
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  return al.includes(bl) || bl.includes(al);
}

function scoreFromIssues(issues: Issue[]): number {
  const penalty = issues.reduce((acc, i) => {
    if (i.severity === 'high') return acc + 10;
    if (i.severity === 'medium') return acc + 5;
    return acc + 2;
  }, 0);
  return Math.max(0, 100 - penalty);
}

function numberLines(text: string): string {
  return text
    .split('\n')
    .map((line, i) => `${i + 1}: ${line}`)
    .join('\n');
}

function numberOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : fallback;
}

function stringOr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function isSeverity(v: unknown): v is Issue['severity'] {
  return v === 'high' || v === 'medium' || v === 'low';
}

function parseLooseJSON(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/);
  const candidate = fenced ? fenced[1] : text;
  if (!candidate) return null;
  try {
    return JSON.parse(candidate.trim()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
