import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import type { GenerateOptions, GenerateResult, LLMProvider } from '../types.ts';
import { withRetry } from './provider.ts';

export interface AnthropicProviderOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_MODEL = 'claude-sonnet-4-6';

export function createAnthropicProvider(opts: AnthropicProviderOptions = {}): LLMProvider {
  const model = opts.model ?? DEFAULT_MODEL;
  if (opts.apiKey) {
    process.env['ANTHROPIC_API_KEY'] = opts.apiKey;
  }

  return {
    name: `anthropic:${model}`,
    async generate(req: GenerateOptions): Promise<GenerateResult> {
      const { text, usage } = await withRetry(
        () =>
          generateText({
            model: anthropic(model),
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
