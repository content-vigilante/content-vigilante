import type { BrandGuide, BrandRule, Issue, LLMProvider } from '../types.ts';

export interface ToneJudgeInput {
  content: string;
  guide: BrandGuide;
  llm: LLMProvider;
  /** If false, also include vocabulary rules (cheap fallback before vocab judge ships). */
  toneOnly?: boolean;
}

export interface ToneJudgeResult {
  score: number;
  issues: Issue[];
  judgeName: string;
}

/**
 * Score content against the brand guide's tone rules.
 *
 * v0.1 implementation: passes all rules of category `tone` (and optionally
 * `vocabulary`) directly to the LLM as system context. No retrieval yet —
 * tone-rule sets are typically <50 items so we can afford to pass them all.
 *
 * Multi-judge variance is added by the aggregator, not here.
 *
 * TODO(week 1 day 5): switch to embedding-based retrieval when guides
 *                     grow beyond what fits comfortably in context.
 */
export async function judgeTone(input: ToneJudgeInput): Promise<ToneJudgeResult> {
  const includeVocab = input.toneOnly !== true;
  const relevantRules = input.guide.rules.filter(
    (r) => r.category === 'tone' || (includeVocab && r.category === 'vocabulary'),
  );
  const rulesBlock = formatRules(relevantRules);

  const system = `You are a brand voice auditor. Given a brand's tone & vocabulary rules and a piece of content, score how well the content matches the brand voice (0-100) and list specific deviations.

Output strictly valid JSON of the form:
{
  "score": number,
  "issues": [
    { "line": number, "text": string, "rule": string, "suggestion": string, "severity": "high" | "medium" | "low", "type": "tone" | "vocabulary" }
  ]
}

Rules:
- "line" is the 1-indexed line number from the content shown.
- "text" is the exact phrase that violates the rule.
- "suggestion" is a short rewrite that would fix the issue.
- "severity": high = clear violation; medium = stylistic mismatch; low = arguable.
- Only flag concrete, line-level issues. Don't invent rules. Don't add commentary.
- If the content is on-brand, return score 90+ and an empty issues array.`;

  const prompt = `Brand: ${input.guide.source}
Language: ${input.guide.language}

Brand rules to check against:
${rulesBlock || '(no relevant rules supplied)'}

Content to audit (line numbers prefixed):
${numberLines(input.content)}

Score this content's match to the brand voice and list specific line-level deviations as JSON.`;

  const { text } = await input.llm.generate({ system, prompt, maxTokens: 2000, temperature: 0.1 });

  const parsed = parseLooseJSON(text);
  return {
    judgeName: input.llm.name,
    score: clamp(numberOr(parsed?.score, 0), 0, 100),
    issues: Array.isArray(parsed?.issues)
      ? (parsed.issues as Array<Record<string, unknown>>).map(
          (i): Issue => ({
            line: numberOr(i['line'], 0),
            type: isIssueTypeString(i['type']) ? (i['type'] as Issue['type']) : 'tone',
            severity: isSeverity(i['severity']) ? (i['severity'] as Issue['severity']) : 'medium',
            text: stringOr(i['text']),
            rule: stringOr(i['rule']),
            suggestion: stringOr(i['suggestion']),
          }),
        )
      : [],
  };
}

function formatRules(rules: BrandRule[]): string {
  return rules
    .map((r) => {
      const examples =
        r.examples?.bad?.length || r.examples?.good?.length
          ? ` (e.g. ${[...(r.examples?.bad ?? []).map((e) => `bad: "${e}"`), ...(r.examples?.good ?? []).map((e) => `good: "${e}"`)].slice(0, 2).join('; ')})`
          : '';
      return `- [${r.category}] ${r.description}${examples}`;
    })
    .join('\n');
}

function numberLines(text: string): string {
  return text
    .split('\n')
    .map((line, i) => `${i + 1}: ${line}`)
    .join('\n');
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
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

function isIssueTypeString(v: unknown): boolean {
  return v === 'tone' || v === 'vocabulary' || v === 'structure' || v === 'readability';
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
