import { join } from 'node:path';
import { extractContent } from '@content-vigilante/core/extractors';
import { loadGuideFromJSON } from '@content-vigilante/core/guides/loadFromJSON';
import { runAggregator as audit } from '@content-vigilante/core/judges/aggregator';
import {
  createAnthropicProvider,
  createOllamaProvider,
  createOpenAIProvider,
} from '@content-vigilante/core/llm';
import type { BrandGuide, LLMProvider, Language } from '@content-vigilante/core/types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  inputType?: 'text' | 'url';
  content?: string;
  url?: string;
  provider?: 'anthropic' | 'openai' | 'ollama';
  apiKey?: string;
  model?: string;
  customGuide?: BrandGuide;
}

interface RouteDeps {
  audit: typeof audit;
  extractContent: typeof extractContent;
  getGuide: typeof getGuide;
  pickProvider: typeof pickProvider;
}

function pickProvider(
  provider: Body['provider'],
  apiKey: string | undefined,
  model: string | undefined,
): LLMProvider {
  switch (provider) {
    case 'anthropic':
      if (!apiKey) throw new Error('API key required for Anthropic.');
      return createAnthropicProvider({ apiKey, ...(model ? { model } : {}) });
    case 'openai':
      if (!apiKey) throw new Error('API key required for OpenAI.');
      return createOpenAIProvider({ apiKey, ...(model ? { model } : {}) });
    case 'ollama':
      return createOllamaProvider({ ...(model ? { model } : {}) });
    default:
      throw new Error(`Unknown provider: ${String(provider)}`);
  }
}

const GUIDE_BY_LANGUAGE: Record<Language, string> = {
  en: 'mailchimp',
  it: 'designers-italia',
};

const cachedGuides: Partial<Record<Language, BrandGuide>> = {};

async function getGuide(language: Language): Promise<BrandGuide> {
  const cached = cachedGuides[language];
  if (cached) return cached;
  const slug = GUIDE_BY_LANGUAGE[language];
  const path = join(process.cwd(), '..', 'core', 'src', 'guides', 'data', `${slug}.json`);
  const guide = await loadGuideFromJSON(path);
  cachedGuides[language] = guide;
  return guide;
}

function getInput(body: Body): { type: 'text' | 'url'; value: string } | null {
  if (body.inputType === 'url' || (!body.content?.trim() && body.url?.trim())) {
    const url = body.url?.trim();
    return url ? { type: 'url', value: url } : null;
  }
  const content = body.content?.trim();
  return content ? { type: 'text', value: content } : null;
}

export function createPostHandler(overrides: Partial<RouteDeps> = {}) {
  const deps: RouteDeps = {
    audit,
    extractContent,
    getGuide,
    pickProvider,
    ...overrides,
  };

  return async function POST(req: Request) {
    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const input = getInput(body);
    if (!input) {
      return NextResponse.json(
        { error: body.inputType === 'url' ? 'URL is required.' : 'Content is required.' },
        { status: 400 },
      );
    }

    try {
      const llm = deps.pickProvider(body.provider, body.apiKey, body.model);
      const { text, language } = await deps.extractContent(input);
      const guide = body.customGuide?.rules?.length
        ? body.customGuide
        : await deps.getGuide(language);
      const result = await deps.audit({
        content: text,
        contentLanguage: language,
        guide,
        llm,
      });
      return NextResponse.json(result);
    } catch (err) {
      const message = (err as Error).message ?? 'Audit failed.';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export const POST = createPostHandler();
