import { AuditClient } from '@/components/AuditClient';
import { GuideIngest } from '@/components/dashboard/GuideIngest';
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
            Fallback guide
          </div>
          <div className="mt-2 text-sm font-medium">Mailchimp Content Style Guide</div>
          <div className="mt-1 text-xs text-[var(--color-fg-muted)]">
            57 rules · used when no custom guide is uploaded
          </div>
        </Card>
        <div className="md:col-span-2">
          <GuideIngest />
        </div>
      </div>

      <AuditClient />
    </>
  );
}
