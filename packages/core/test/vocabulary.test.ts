import { describe, expect, it } from 'bun:test';
import { judgeVocabulary } from '../src/judges/vocabulary.ts';
import type { BrandGuide, GenerateOptions, GenerateResult, LLMProvider } from '../src/types.ts';

function mockProvider(text: string): LLMProvider {
  return {
    name: 'mock:test',
    async generate(_opts: GenerateOptions): Promise<GenerateResult> {
      return { text, tokensUsed: 10 };
    },
  };
}

const emptyLLM = mockProvider('{ "issues": [] }');

const guide: BrandGuide = {
  source: 'mailchimp-stub',
  language: 'en',
  rawText: '',
  rules: [
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
    {
      id: 'vocab-learnings',
      category: 'vocabulary',
      description: 'Avoid "learnings."',
    },
    {
      id: 'tone-direct',
      category: 'tone',
      description: 'Be direct.',
    },
  ],
};

const emptyGuide: BrandGuide = {
  source: 'empty',
  language: 'en',
  rawText: '',
  rules: [],
};

describe('judgeVocabulary deterministic', () => {
  it('catches "utilize" via word boundary', async () => {
    const result = await judgeVocabulary({
      content: 'We utilize the platform daily.',
      guide,
      llm: emptyLLM,
      skipLLM: true,
    });
    expect(result.deterministicMatches).toBe(1);
    expect(result.issues[0]?.text.toLowerCase()).toBe('utilize');
    expect(result.issues[0]?.severity).toBe('high');
    expect(result.issues[0]?.suggestion).toBe('Use the tool.');
  });

  it('does not match "utilization" (no suffix false positives)', async () => {
    const result = await judgeVocabulary({
      content: 'Resource utilization is high.',
      guide,
      llm: emptyLLM,
      skipLLM: true,
    });
    expect(result.deterministicMatches).toBe(0);
    expect(result.score).toBe(100);
  });

  it('catches multiple prohibited terms in one line', async () => {
    const result = await judgeVocabulary({
      content: 'We utilize tools to leverage learnings.',
      guide,
      llm: emptyLLM,
      skipLLM: true,
    });
    expect(result.deterministicMatches).toBe(3);
    expect(result.issues.every((i) => i.line === 1)).toBe(true);
  });

  it('skipLLM: true returns only deterministic issues', async () => {
    const llm = mockProvider(
      `{ "issues": [{ "line": 1, "text": "synergy", "rule": "x", "suggestion": "y", "severity": "medium" }] }`,
    );
    const result = await judgeVocabulary({
      content: 'We utilize synergy.',
      guide,
      llm,
      skipLLM: true,
    });
    expect(result.llmIssues).toBe(0);
    expect(result.issues).toHaveLength(1);
  });

  it('case-insensitive matching', async () => {
    const result = await judgeVocabulary({
      content: 'Utilize this. UTILIZE that.',
      guide,
      llm: emptyLLM,
      skipLLM: true,
    });
    expect(result.deterministicMatches).toBe(2);
  });

  it('empty vocabulary rules → score 100, no issues', async () => {
    const result = await judgeVocabulary({
      content: 'Anything goes utilize leverage.',
      guide: emptyGuide,
      llm: emptyLLM,
    });
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it('score floor at 0 even with many issues', async () => {
    const content = Array.from({ length: 20 }, () => 'utilize leverage learnings').join('\n');
    const result = await judgeVocabulary({
      content,
      guide,
      llm: emptyLLM,
      skipLLM: true,
    });
    expect(result.deterministicMatches).toBeGreaterThan(10);
    expect(result.score).toBe(0);
  });
});

describe('judgeVocabulary LLM merge', () => {
  it('merges LLM issues with deterministic ones', async () => {
    const llm = mockProvider(
      `{ "issues": [
        { "line": 2, "text": "circle back", "rule": "no jargon", "suggestion": "follow up", "severity": "medium" }
      ] }`,
    );
    const result = await judgeVocabulary({
      content: 'We utilize the tool.\nLet us circle back tomorrow.',
      guide,
      llm,
    });
    expect(result.deterministicMatches).toBe(1);
    expect(result.llmIssues).toBe(1);
    expect(result.issues).toHaveLength(2);
    expect(result.issues.find((i) => i.text === 'circle back')).toBeDefined();
  });

  it('dedupes overlapping LLM issues against deterministic ones', async () => {
    const llm = mockProvider(
      `{ "issues": [
        { "line": 1, "text": "utilize", "rule": "no jargon", "suggestion": "use", "severity": "medium" }
      ] }`,
    );
    const result = await judgeVocabulary({
      content: 'We utilize the tool.',
      guide,
      llm,
    });
    expect(result.deterministicMatches).toBe(1);
    expect(result.llmIssues).toBe(1);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.severity).toBe('high');
  });
});
