/**
 * Text extractor — pass-through with language detection.
 */
import { franc } from 'franc';
import { EmptyContentError, type Language, UnsupportedLanguageError } from '../types.ts';

export function detectLanguage(text: string): Language {
  // franc needs a reasonable amount of text; allow short samples via minLength.
  const code = franc(text, { minLength: 10 });
  if (code === 'eng') return 'en';
  if (code === 'ita') return 'it';
  throw new UnsupportedLanguageError(
    `Detected language "${code}" is not supported. Only English ("en") and Italian ("it") are supported.`,
  );
}

export function extractText(value: string): { text: string; language: Language } {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new EmptyContentError('Input text is empty or whitespace only.');
  }
  const language = detectLanguage(trimmed);
  return { text: trimmed, language };
}
