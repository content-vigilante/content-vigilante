import { describe, expect, it } from 'bun:test';
import { judgeTone } from '../src/judges/tone.ts';
import { withRetry } from '../src/llm/provider.ts';
import type { GenerateOptions, GenerateResult, LLMProvider } from '../src/types.ts';
import type { BrandGuide } from '../src/types.ts';

function mockProvider(text: string): LLMProvider {
  return {
    name: 'mock:test',
    async generate(_opts: GenerateOptions): Promise<GenerateResult> {
      return { text, tokensUsed: 42 };
    },
  };
}

const mailchimpStub: BrandGuide = {
  source: 'mailchimp-stub',
  language: 'en',
  rawText: '',
  rules: [
    {
      id: 'tone-no-jargon',
      category: 'tone',
      description: 'Avoid corporate jargon. Speak plainly.',
    },
    {
      id: 'tone-no-throat-clearing',
      category: 'tone',
      description: 'Be direct. No throat-clearing phrases like "we are pleased to announce".',
    },
  ],
};

describe('withRetry', () => {
  it('returns the value on success', async () => {
    const result = await withRetry(() => Promise.resolve(7), { timeoutMs: 1000, retries: 1 });
    expect(result).toBe(7);
  });

  it('retries once on failure then succeeds', async () => {
    let calls = 0;
    const result = await withRetry(
      () => {
        calls++;
        if (calls === 1) throw new Error('boom');
        return Promise.resolve('ok');
      },
      { timeoutMs: 1000, retries: 1 },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });

  it('rejects with timeout when fn hangs longer than the budget', async () => {
    await expect(
      withRetry(() => new Promise(() => {}), { timeoutMs: 50, retries: 0 }),
    ).rejects.toThrow(/timeout/i);
  });
});

describe('judgeTone', () => {
  it('parses a well-formed JSON judge response', async () => {
    const llm = mockProvider(`{
      "score": 64,
      "issues": [
        {
          "line": 1,
          "text": "We are pleased to announce",
          "rule": "Be direct. No throat-clearing.",
          "suggestion": "Today we're launching",
          "severity": "high"
        }
      ]
    }`);

    const result = await judgeTone({
      content: 'We are pleased to announce our new platform.',
      guide: mailchimpStub,
      llm,
    });

    expect(result.score).toBe(64);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.type).toBe('tone');
    expect(result.issues[0]?.severity).toBe('high');
    expect(result.judgeName).toBe('mock:test');
  });

  it('handles fenced JSON in markdown blocks', async () => {
    const llm = mockProvider('```json\n{ "score": 80, "issues": [] }\n```');
    const result = await judgeTone({
      content: 'Plain content.',
      guide: mailchimpStub,
      llm,
    });
    expect(result.score).toBe(80);
    expect(result.issues).toHaveLength(0);
  });

  it('returns zero score and no issues on malformed JSON', async () => {
    const llm = mockProvider('not json at all');
    const result = await judgeTone({
      content: 'Plain content.',
      guide: mailchimpStub,
      llm,
    });
    expect(result.score).toBe(0);
    expect(result.issues).toHaveLength(0);
  });
});
