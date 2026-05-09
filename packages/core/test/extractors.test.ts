import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { extractContent } from '../src/extractors/index.ts';
import { EmptyContentError, URLFetchError, UnsupportedLanguageError } from '../src/types.ts';

const EN_SAMPLE =
  'The quick brown fox jumps over the lazy dog. This is a sufficiently long English passage that should be detected reliably by the franc language detector. We add several sentences for stability.';
const IT_SAMPLE =
  'La volpe marrone salta sopra il cane pigro. Questo è un passaggio sufficientemente lungo in lingua italiana che dovrebbe essere rilevato in modo affidabile dal rilevatore di lingue franc. Aggiungiamo diverse frasi per la stabilità.';
const FR_SAMPLE =
  'Le renard brun rapide saute par-dessus le chien paresseux. Ceci est un passage suffisamment long en langue française qui devrait être détecté de manière fiable par le détecteur de langues franc. Nous ajoutons plusieurs phrases pour la stabilité.';

describe('extractContent — text path', () => {
  test('detects English correctly', async () => {
    const result = await extractContent({ type: 'text', value: EN_SAMPLE });
    expect(result.language).toBe('en');
    expect(result.text).toBe(EN_SAMPLE);
  });

  test('detects Italian correctly', async () => {
    const result = await extractContent({ type: 'text', value: IT_SAMPLE });
    expect(result.language).toBe('it');
  });

  test('throws EmptyContentError on empty string', async () => {
    await expect(extractContent({ type: 'text', value: '' })).rejects.toBeInstanceOf(
      EmptyContentError,
    );
  });

  test('throws EmptyContentError on whitespace-only string', async () => {
    await expect(extractContent({ type: 'text', value: '   \n\t  ' })).rejects.toBeInstanceOf(
      EmptyContentError,
    );
  });

  test('throws UnsupportedLanguageError on French content', async () => {
    await expect(extractContent({ type: 'text', value: FR_SAMPLE })).rejects.toBeInstanceOf(
      UnsupportedLanguageError,
    );
  });
});

// --- URL path with mocked fetch ---

const realFetch = globalThis.fetch;

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  globalThis.fetch = Object.assign(async (input: Parameters<typeof fetch>[0]) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    return handler(url);
  }, realFetch);
}

describe('extractContent — url path', () => {
  beforeEach(() => {
    // ensure isolated state
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test('mocked fetch returns HTML and extractor parses it', async () => {
    const html = `<!doctype html><html><head><title>Test</title></head><body>
      <article>
        <h1>The Brown Fox</h1>
        <p>${EN_SAMPLE}</p>
        <p>${EN_SAMPLE}</p>
        <p>${EN_SAMPLE}</p>
      </article>
    </body></html>`;
    mockFetch(() => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }));

    const result = await extractContent({ type: 'url', value: 'https://example.com/article' });
    expect(result.language).toBe('en');
    expect(result.text.length).toBeGreaterThan(100);
    expect(result.text.toLowerCase()).toContain('fox');
  });

  test('mocked fetch returns 404 → URLFetchError', async () => {
    mockFetch(() => new Response('not found', { status: 404, statusText: 'Not Found' }));
    await expect(
      extractContent({ type: 'url', value: 'https://example.com/missing' }),
    ).rejects.toBeInstanceOf(URLFetchError);
  });

  test('tiny content with no Playwright → URLFetchError or EmptyContentError', async () => {
    // Page with <50 chars of readable content; Playwright fallback will fail to import.
    const html = '<!doctype html><html><body><div>Hi</div></body></html>';
    mockFetch(() => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }));

    let caught: unknown;
    try {
      await extractContent({ type: 'url', value: 'https://example.com/thin' });
    } catch (err) {
      caught = err;
    }
    // Either Playwright-missing URLFetchError, or EmptyContentError if fallback path swallowed.
    expect(caught instanceof URLFetchError || caught instanceof EmptyContentError).toBe(true);
  });

  test('invalid URL → URLFetchError', async () => {
    await expect(extractContent({ type: 'url', value: 'not a url' })).rejects.toBeInstanceOf(
      URLFetchError,
    );
  });
});
