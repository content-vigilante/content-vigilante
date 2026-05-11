import { describe, expect, test } from 'bun:test';
import type { BrandGuide, LLMProvider } from '@content-vigilante/core/types';
import { createPostHandler } from './route.ts';

const fakeLLM: LLMProvider = {
  name: 'test:llm',
  async generate() {
    return { text: '', tokensUsed: 0 };
  },
};

const guideFor = (source: string, language: 'en' | 'it'): BrandGuide => ({
  source,
  language,
  rawText: '',
  rules: [],
});

describe('/api/audit', () => {
  test('routes English content to the Mailchimp guide', async () => {
    const handler = createPostHandler({
      extractContent: async () => ({ text: 'English text', language: 'en' }),
      getGuide: async (language) =>
        guideFor(language === 'en' ? 'mailchimp' : 'unexpected', language),
      pickProvider: () => fakeLLM,
      audit: async ({ guide }) => ({
        score: guide.source === 'mailchimp' ? 91 : 0,
        dimensions: { tone: 90, vocabulary: 90, structure: 90, readability: 90 },
        issues: [],
        strengths: [],
        metadata: { judgeAgreement: 1, tokensUsed: 0, durationMs: 1 },
      }),
    });

    const response = await handler(
      new Request('http://localhost/api/audit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'Hello world', provider: 'ollama' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ score: 91 });
  });

  test('routes Italian content to the Designers Italia guide', async () => {
    const handler = createPostHandler({
      extractContent: async () => ({ text: 'Testo italiano', language: 'it' }),
      getGuide: async (language) =>
        guideFor(language === 'it' ? 'designers-italia' : 'unexpected', language),
      pickProvider: () => fakeLLM,
      audit: async ({ guide }) => ({
        score: guide.source === 'designers-italia' ? 88 : 0,
        dimensions: { tone: 80, vocabulary: 90, structure: 90, readability: 92 },
        issues: [],
        strengths: [],
        metadata: { judgeAgreement: 1, tokensUsed: 0, durationMs: 1 },
      }),
    });

    const response = await handler(
      new Request('http://localhost/api/audit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'Ciao mondo', provider: 'ollama' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ score: 88 });
  });

  test('passes URL audit requests through the URL extractor path', async () => {
    const inputs: Array<{ type: 'text' | 'url'; value: string }> = [];
    const handler = createPostHandler({
      extractContent: async (input) => {
        inputs.push(input);
        return { text: 'English text', language: 'en' };
      },
      getGuide: async () => guideFor('mailchimp', 'en'),
      pickProvider: () => fakeLLM,
      audit: async () => ({
        score: 75,
        dimensions: { tone: 70, vocabulary: 80, structure: 75, readability: 75 },
        issues: [],
        strengths: [],
        metadata: { judgeAgreement: 1, tokensUsed: 0, durationMs: 1 },
      }),
    });

    const response = await handler(
      new Request('http://localhost/api/audit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          inputType: 'url',
          url: 'https://example.com/article',
          provider: 'ollama',
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(inputs).toEqual([{ type: 'url', value: 'https://example.com/article' }]);
  });
});
