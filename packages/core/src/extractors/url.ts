/**
 * URL extractor — fetches a URL and returns clean readable text plus detected language.
 *
 * Strategy:
 *   1. Plain `fetch()` + Readability via linkedom DOM. If output is reasonable (>200 chars), done.
 *   2. Fallback: if status was 403/429 OR the parsed text is too short, render with Playwright
 *      (optional dep — try-imported). If Playwright is missing, throw a helpful error.
 */
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { EmptyContentError, type Language, URLFetchError } from '../types.ts';
import { detectLanguage } from './text.ts';

const MIN_READABLE_CHARS = 200;
const MIN_NONEMPTY_CHARS = 50;
const USER_AGENT =
  'Mozilla/5.0 (compatible; ContentVigilante/0.1; +https://github.com/content-vigilante/Content-Vigilante)';

interface ParseResult {
  text: string;
  /** True if the text passes the "reasonable length" bar. */
  reasonable: boolean;
}

function parseHtmlToText(html: string): ParseResult {
  // linkedom's parseHTML gives us a Document compatible enough for Readability.
  const { document } = parseHTML(html);
  const article = new Readability(document as unknown as Document).parse();
  const text = (article?.textContent ?? '')
    .trim()
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ');
  return { text, reasonable: text.length >= MIN_READABLE_CHARS };
}

interface PlaywrightLike {
  chromium: {
    launch(opts: { headless: boolean }): Promise<{
      newContext(opts: { userAgent: string }): Promise<{
        newPage(): Promise<{
          goto(url: string, opts: { waitUntil: string; timeout: number }): Promise<unknown>;
          content(): Promise<string>;
        }>;
      }>;
      close(): Promise<void>;
    }>;
  };
}

async function renderWithPlaywright(url: string): Promise<string> {
  let playwright: PlaywrightLike;
  try {
    const packageName = ['playwright'].join('');
    playwright = (await import(packageName)) as PlaywrightLike;
  } catch {
    throw new URLFetchError(
      'JavaScript-rendered page detected but Playwright is not installed. ' +
        'Install it with `bun add playwright` (and run `bunx playwright install chromium`) to enable rendering fallback.',
    );
  }
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    return await page.content();
  } finally {
    await browser.close();
  }
}

export async function extractURL(url: string): Promise<{ text: string; language: Language }> {
  let parsedURL: URL;
  try {
    parsedURL = new URL(url);
  } catch {
    throw new URLFetchError(`Invalid URL: "${url}"`);
  }
  if (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:') {
    throw new URLFetchError(`Unsupported URL protocol: "${parsedURL.protocol}"`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
  } catch (err) {
    throw new URLFetchError(`Network error fetching ${url}: ${(err as Error).message}`);
  }

  const blockedByServer = response.status === 403 || response.status === 429;
  let parsed: ParseResult = { text: '', reasonable: false };

  if (response.ok) {
    const html = await response.text();
    parsed = parseHtmlToText(html);
  } else if (!blockedByServer) {
    throw new URLFetchError(
      `Failed to fetch ${url}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  // Fallback to Playwright if blocked OR content was too thin (likely JS-rendered).
  if (blockedByServer || !parsed.reasonable) {
    try {
      const renderedHTML = await renderWithPlaywright(url);
      parsed = parseHtmlToText(renderedHTML);
    } catch (err) {
      if (err instanceof URLFetchError) {
        // If we already had *some* non-empty content from the plain fetch, use it.
        if (parsed.text.length >= MIN_NONEMPTY_CHARS) {
          // proceed with the (sub-optimal) plain-fetch text
        } else {
          throw err;
        }
      } else {
        throw new URLFetchError(
          `Playwright rendering failed for ${url}: ${(err as Error).message}`,
        );
      }
    }
  }

  if (parsed.text.length < MIN_NONEMPTY_CHARS) {
    throw new EmptyContentError(
      `No readable content extracted from ${url} (got ${parsed.text.length} chars).`,
    );
  }

  const language = detectLanguage(parsed.text);
  return { text: parsed.text, language };
}
