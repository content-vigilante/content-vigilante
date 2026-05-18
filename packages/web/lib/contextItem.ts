export interface ContextItem {
  id: string;
  name: string;
  /** mime type, best-effort */
  type: string;
  size: number;
  /** Extracted plain-text content (truncated to ~80k chars). */
  text: string;
  /** User tags, free-form */
  tags: string[];
  notes?: string;
  uploadedAt: string;
}

export const CONTEXT_KEY = 'context';

export function summarize(item: ContextItem, maxChars = 600): string {
  const t = item.text.replace(/\s+/g, ' ').trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}…`;
}
