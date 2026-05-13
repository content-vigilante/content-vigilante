import {
  createAnthropicProvider,
  createOllamaProvider,
  createOpenAIProvider,
} from '@content-vigilante/core/llm';
import type { LLMProvider } from '@content-vigilante/core/types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  prompt?: string;
  platform?: string;
  provider?: 'anthropic' | 'openai' | 'ollama';
  apiKey?: string;
  model?: string;
}

const PLATFORM_HINT: Record<string, string> = {
  linkedin: 'LinkedIn post (professional, ~200–400 chars per variant, no hashtag spam)',
  instagram: 'Instagram caption (warm, scannable, 1–3 emojis, 1–4 hashtags at end)',
  x: 'X/Twitter post (≤ 240 chars, punchy, one idea per variant)',
  facebook: 'Facebook post (conversational, 1–2 short paragraphs)',
  newsletter: 'Newsletter subject line + 1-line preheader',
};

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

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
  }

  try {
    const llm = pickProvider(body.provider, body.apiKey, body.model);
    const platformHint = PLATFORM_HINT[body.platform ?? 'linkedin'] ?? PLATFORM_HINT.linkedin;

    const system =
      'You write social-media copy that stays on-brand. Avoid corporate clichés ("synergy", "leverage", "best-in-class", "ninja", "rockstar", "crush it", "automagical", "utilize"). Write naturally. No emoji walls. Never invent product features.';

    const prompt = `Write FIVE distinct caption variants for this post.

Topic: ${body.prompt.trim()}
Format: ${platformHint}

Rules:
- Each variant must be substantively different in angle (informative / contrarian / personal / data-led / question).
- No filler. No bracketed placeholders.
- Output ONLY a JSON array of 5 strings. No prose, no markdown fences.`;

    const { text } = await llm.generate({
      system,
      prompt,
      temperature: 0.8,
      maxTokens: 800,
    });

    let variants: string[] = [];
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) variants = parsed.filter((v) => typeof v === 'string');
      } catch {
        // fall through
      }
    }
    if (variants.length === 0) {
      variants = text
        .split(/\n+/)
        .map((l) => l.replace(/^[\s\-*\d.)"]+/, '').replace(/"$/, '').trim())
        .filter((l) => l.length > 20)
        .slice(0, 5);
    }

    return NextResponse.json({ variants });
  } catch (err) {
    const message = (err as Error).message ?? 'Generation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
