/**
 * URL extractor — fetches a URL and returns clean readable text plus detected language.
 *
 * Strategy:
 *   1. Plain `fetch()` + Readability via linkedom DOM. If output is reasonable (>200 chars), done.
 *   2. Fallback: if status was 403/429 OR the parsed text is too short, render with Playwright
 *      (optional dep — try-imported). If Playwright is missing, throw a helpful error.
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
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

interface ExtractURLOptions {
  allowPrivateHosts?: boolean;
}

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  const a = parts[0];
  const b = parts[1];
  if (a === undefined || b === undefined) return false;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function isPrivateIPv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  );
}

function isPrivateAddress(hostname: string): boolean {
  const ipVersion = isIP(hostname);
  if (ipVersion === 4) return isPrivateIPv4(hostname);
  if (ipVersion === 6) return isPrivateIPv6(hostname);
  return false;
}

async function assertSafeTarget(parsedURL: URL, opts: ExtractURLOptions): Promise<void> {
  if (opts.allowPrivateHosts) return;

  const hostname = parsedURL.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new URLFetchError(`Refusing to fetch local or private URL host: "${parsedURL.hostname}"`);
  }

  if (isPrivateAddress(hostname)) {
    throw new URLFetchError(`Refusing to fetch private network address: "${parsedURL.hostname}"`);
  }

  if (isIP(hostname)) return;

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (addresses.some((address) => isPrivateAddress(address.address))) {
      throw new URLFetchError(`Refusing to fetch private network host: "${parsedURL.hostname}"`);
    }
  } catch (err) {
    if (err instanceof URLFetchError) throw err;
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return;
    throw new URLFetchError(`Could not resolve ${parsedURL.hostname}: ${(err as Error).message}`);
  }
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

export async function extractURL(
  url: string,
  opts: ExtractURLOptions = {},
): Promise<{ text: string; language: Language }> {
  let parsedURL: URL;
  try {
    parsedURL = new URL(url);
  } catch {
    throw new URLFetchError(`Invalid URL: "${url}"`);
  }
  if (parsedURL.protocol !== 'http:' && parsedURL.protocol !== 'https:') {
    throw new URLFetchError(`Unsupported URL protocol: "${parsedURL.protocol}"`);
  }
  await assertSafeTarget(parsedURL, opts);

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
