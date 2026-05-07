import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import type { GenerateOptions, GenerateResult, LLMProvider } from '../types.ts';
import { withRetry } from './provider.ts';

export interface OllamaProviderOptions {
  baseURL?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_MODEL = 'llama3.3:70b';
const DEFAULT_BASE_URL = 'http://localhost:11434/api';

export function createOllamaProvider(opts: OllamaProviderOptions = {}): LLMProvider {
  const model = opts.model ?? DEFAULT_MODEL;
  const ollama = createOllama({ baseURL: opts.baseURL ?? DEFAULT_BASE_URL });

  return {
    name: `ollama:${model}`,
    async generate(req: GenerateOptions): Promise<GenerateResult> {
      const { text, usage } = await withRetry(
        () =>
          generateText({
            model: ollama(model),
            system: req.system,
            prompt: req.prompt,
            maxTokens: req.maxTokens ?? 1024,
            temperature: req.temperature ?? 0.2,
          }),
        { timeoutMs: opts.timeoutMs ?? 60_000, retries: 1 },
      );
      return {
        text,
        tokensUsed: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
      };
    },
  };
}
