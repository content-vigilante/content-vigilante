/**
 * Content extractors — dispatch on input source type.
 */
import type { Language } from '../types.ts';
import { extractText } from './text.ts';
import { extractURL } from './url.ts';

export { extractText } from './text.ts';
export { extractURL } from './url.ts';

export async function extractContent(source: {
  type: 'text' | 'url';
  value: string;
}): Promise<{ text: string; language: Language }> {
  if (source.type === 'text') return extractText(source.value);
  if (source.type === 'url') return extractURL(source.value);
  throw new Error(`Unsupported extractor type: ${String((source as { type: string }).type)}`);
}
