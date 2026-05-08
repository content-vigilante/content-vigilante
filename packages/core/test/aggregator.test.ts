import { describe, expect, it } from 'bun:test';
import { DEFAULT_WEIGHTS, runAggregator } from '../src/judges/aggregator.ts';
import type { BrandGuide, GenerateOptions, GenerateResult, LLMProvider } from '../src/types.ts';

function mockProvider(text: string): LLMProvider {
  return {
    name: 'mock:test',
    async generate(_opts: GenerateOptions): Promise<GenerateResult> {
      return { text, tokensUsed: 10 };
    },
  };
}

const guide: BrandGuide = {
  source: 'mock-mailchimp',
  language: 'en',
  rawText: '',
  rules: [
    {
      id: 'tone-direct',
      category: 'tone',
      description: 'Be direct. No throat-clearing.',
    },
    {
      id: 'vocab-utilize',
      category: 'vocabulary',
      description: 'Avoid "utilize." Use "use" instead.',
      examples: { good: ['Use the tool.'] },
    },
    {
      id: 'vocab-leverage',
      category: 'vocabulary',
      description: 'Avoid "leverage" as a verb.',
    },
  ],
};

describe('runAggregator', () => {
  it('combines tone + vocab + structure into a single AuditResult', async () => {
    const llm = mockProvider(`{
      "score": 60,
      "issues": [{ "line": 1, "text": "we are pleased", "rule": "Be direct.",
                   "suggestion": "today we", "severity": "medium" }]
    }`);
    const result = await runAggregator(
      {
        content: 'We are pleased to utilize this platform daily.',
        contentLanguage: 'en',
        guide,
        llm,
      },
      { skipVocabLLM: true },
    );

    expect(result.dimensions.tone).toBe(60);
    expect(result.dimensions.vocabulary).toBeLessThan(100); // utilize flagged
    expect(result.dimensions.structure).toBeGreaterThan(0);
    expect(result.dimensions.readability).toBeGreaterThan(0);
    expect(result.issues.length).toBeGreaterThan(0);

    // weighted overall: 60*0.4 + vocab*0.25 + struct*0.2 + read*0.15
    const expected =
      result.dimensions.tone * DEFAULT_WEIGHTS.tone +
      result.dimensions.vocabulary * DEFAULT_WEIGHTS.vocabulary +
      result.dimensions.structure * DEFAULT_WEIGHTS.structure +
      result.dimensions.readability * DEFAULT_WEIGHTS.readability;
    expect(Math.abs(result.score - Math.round(expected))).toBeLessThanOrEqual(1);
  });

  it('dedupes issues across judges by line + type + text', async () => {
    const llm = mockProvider(`{
      "score": 70,
      "issues": [{ "line": 1, "text": "utilize", "rule": "x", "suggestion": "use",
                   "severity": "medium", "type": "vocabulary" }]
    }`);
    const result = await runAggregator(
      {
        content: 'We utilize this tool.',
        contentLanguage: 'en',
        guide,
        llm,
      },
      { skipVocabLLM: true },
    );
    // Both tone judge (which sees vocab via toneOnly=false default) and vocab judge
    // could surface "utilize". But aggregator now uses toneOnly=true, so tone shouldn't.
    // We expect at most 1 utilize issue in the output.
    const utilize = result.issues.filter((i) => i.text.toLowerCase() === 'utilize' && i.line === 1);
    expect(utilize.length).toBeLessThanOrEqual(1);
  });

  it('honors custom weights', async () => {
    const llm = mockProvider('{ "score": 100, "issues": [] }');
    const baseline = await runAggregator(
      {
        content: 'Clean content with no issues.',
        contentLanguage: 'en',
        guide,
        llm,
      },
      { skipVocabLLM: true },
    );

    const toneOnly = await runAggregator(
      {
        content: 'Clean content with no issues.',
        contentLanguage: 'en',
        guide,
        llm,
      },
      { skipVocabLLM: true, weights: { tone: 1, vocabulary: 0, structure: 0, readability: 0 } },
    );

    expect(baseline.score).toBeGreaterThan(0);
    expect(toneOnly.score).toBe(100);
  });

  it('reports strengths when dimensions are >= 90', async () => {
    const llm = mockProvider('{ "score": 95, "issues": [] }');
    const result = await runAggregator(
      {
        content: 'Short clean content.',
        contentLanguage: 'en',
        guide,
        llm,
      },
      { skipVocabLLM: true },
    );
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it('returns a sane result for completely off-brand content', async () => {
    const llm = mockProvider(`{
      "score": 25,
      "issues": [
        { "line": 1, "text": "we are pleased", "rule": "Be direct.", "suggestion": "today", "severity": "high" }
      ]
    }`);
    const result = await runAggregator(
      {
        content: 'We are pleased to utilize and leverage best-in-class tools to crush it!',
        contentLanguage: 'en',
        guide,
        llm,
      },
      { skipVocabLLM: true },
    );
    expect(result.score).toBeLessThan(80);
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });
});
