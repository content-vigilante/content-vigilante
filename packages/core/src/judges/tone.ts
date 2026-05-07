import type { BrandGuide, Issue, LLMProvider } from '../types.ts';

export interface ToneJudgeInput {
  content: string;
  guide: BrandGuide;
  llm: LLMProvider;
}

export interface ToneJudgeResult {
  score: number;
  issues: Issue[];
  judgeName: string;
}

/**
 * Score content against the brand guide's tone rules.
 *
 * v0.1 implementation is intentionally simple — single LLM call with the
 * tone rules from the guide as RAG context. Multi-judge variance is added
 * by the aggregator, not here.
 *
 * TODO(v0.1): replace with proper RAG retrieval over guide chunks
 *             once sqlite-vec store lands (week 1, day 2).
 */
export async function judgeTone(input: ToneJudgeInput): Promise<ToneJudgeResult> {
  const toneRules = input.guide.rules
    .filter((r) => r.category === 'tone')
    .map((r) => `- ${r.description}`)
    .join('\n');

  const system = `You are a brand voice auditor. Given a brand's tone rules and a piece of content, score how well the content matches the tone (0-100) and list specific deviations.

Output strictly valid JSON of the form:
{
  "score": number,
  "issues": [
    { "line": number, "text": string, "rule": string, "suggestion": string, "severity": "high" | "medium" | "low" }
  ]
}`;

  const prompt = `Tone rules from the brand guide:
${toneRules || '(no explicit tone rules supplied)'}

Content to audit (line numbers prefixed):
${numberLines(input.content)}

Score this content's tone match and list specific line-level deviations.`;

  const { text } = await input.llm.generate({ system, prompt, maxTokens: 1500, temperature: 0.1 });

  // Best-effort JSON parse. v0.1 keeps this lenient — full schema validation
  // (zod) lands when the aggregator and eval harness are wired up.
  const parsed = parseLooseJSON(text);
  return {
    judgeName: input.llm.name,
    score: clamp(numberOr(parsed?.score, 0), 0, 100),
    issues: Array.isArray(parsed?.issues)
      ? parsed.issues.map(
          (i: Record<string, unknown>): Issue => ({
            line: numberOr(i['line'], 0),
            type: 'tone',
            severity: (i['severity'] as Issue['severity']) ?? 'medium',
            text: stringOr(i['text']),
            rule: stringOr(i['rule']),
            suggestion: stringOr(i['suggestion']),
          }),
        )
      : [],
  };
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
