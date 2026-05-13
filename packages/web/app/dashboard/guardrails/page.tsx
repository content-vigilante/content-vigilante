import Link from 'next/link';
import { AuditClient } from '@/components/AuditClient';
import { Card, PageHeader } from '@/components/dashboard/ui';

export default function GuardrailsPage() {
  return (
    <>
      <PageHeader
        title="Brand Guardrails"
        subtitle="The Vigilante core. Hybrid AI judges: tone, vocabulary, structure & readability."
      />

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
            Active guide
          </div>
          <div className="mt-2 text-sm font-medium">Mailchimp Content Style Guide</div>
          <div className="mt-1 text-xs text-[var(--color-fg-muted)]">
            57 rules · bundled by default
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
            Upload your guide
          </div>
          <div className="mt-2 text-sm">PDF, Markdown, or paste raw rules.</div>
          <Link
            href="#"
            className="mt-2 inline-block text-xs text-[var(--color-accent)] hover:underline"
          >
            Coming next: PDF ingestion →
          </Link>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
            Privacy
          </div>
          <div className="mt-2 text-sm">
            Content is sent only to <em>your</em> chosen LLM provider with your key. Keys never
            leave your browser session.
          </div>
        </Card>
      </div>

      <AuditClient />
    </>
  );
}
