import type { LLMProvider } from '../types.ts';

export type { LLMProvider };

/**
 * Helper: run a generation with timeout + single retry.
 * Used by all built-in providers so error semantics are consistent.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { timeoutMs: number; retries: number },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('LLM timeout')), opts.timeoutMs),
        ),
      ]);
    } catch (err) {
      lastError = err;
      if (attempt < opts.retries) {
        await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}
