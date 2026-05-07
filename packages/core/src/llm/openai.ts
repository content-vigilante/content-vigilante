import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { GenerateOptions, GenerateResult, LLMProvider } from '../types.ts';
import { withRetry } from './provider.ts';

export interface OpenAIProviderOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_MODEL = 'gpt-4o-mini';

export function createOpenAIProvider(opts: OpenAIProviderOptions = {}): LLMProvider {
  const model = opts.model ?? DEFAULT_MODEL;
  if (opts.apiKey) {
    process.env['OPENAI_API_KEY'] = opts.apiKey;
  }

  return {
    name: `openai:${model}`,
    async generate(req: GenerateOptions): Promise<GenerateResult> {
      const { text, usage } = await withRetry(
        () =>
          generateText({
            model: openai(model),
            system: req.system,
            prompt: req.prompt,
            maxTokens: req.maxTokens ?? 1024,
            temperature: req.temperature ?? 0.2,
          }),
        { timeoutMs: opts.timeoutMs ?? 30_000, retries: 1 },
      );
      return {
        text,
        tokensUsed: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
      };
    },
  };
}
