// Re-export the public AuditResult / Issue shape so client components don't
// pull in the entire @content-vigilante/core (which imports server-only deps).

export type Severity = 'high' | 'medium' | 'low';
export type IssueType = 'tone' | 'vocabulary' | 'structure' | 'readability';

export interface Issue {
  line: number;
  type: IssueType;
  severity: Severity;
  text: string;
  rule: string;
  suggestion: string;
}

export interface AuditResult {
  score: number;
  dimensions: {
    tone: number;
    vocabulary: number;
    structure: number;
    readability: number;
  };
  issues: Issue[];
  strengths: string[];
  metadata: {
    judgeAgreement: number;
    tokensUsed: number;
    durationMs: number;
  };
}
