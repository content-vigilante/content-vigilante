# Style Guide Data

This directory contains structured JSON representations of public brand voice and content style guides. Content Vigilante uses these as gold-standard rule sets for auditing copy.

## Files

- `mailchimp.json` — Rules extracted from the Mailchimp Content Style Guide (https://styleguide.mailchimp.com/).

## Schema

Each file follows this shape:

```ts
{
  source: string;        // short id, e.g. "mailchimp"
  language: string;      // BCP-47, e.g. "en"
  version: string;       // extraction tag, e.g. "extracted-2026-05-07"
  url: string;           // upstream source URL
  license: string;       // license string from the source
  rules: Array<{
    id: string;          // unique kebab-case id, prefixed by category
    category: "tone" | "vocabulary" | "structure" | "readability";
    description: string; // plain-English statement of the rule
    examples?: { good?: string[]; bad?: string[] };
  }>;
}
```

## Extraction notes

- `mailchimp.json` was extracted on **2026-05-07** by fetching:
  - `/voice-and-tone/`
  - `/grammar-and-mechanics/`
  - `/word-list/`
  - `/writing-for-accessibility/`
  - `/writing-about-people/`
- Every rule maps to a specific guidance point on the live site at extraction time. No rules were invented or paraphrased into new guidance — descriptions are restatements of source material in our own words.
- The Mailchimp guide is well over 50 atomic rules; we kept the ~57 most testable ones (concrete word swaps, formatting rules, and tone principles that can be programmatically detected or LLM-checked).

## Licensing

The Mailchimp Content Style Guide is published by Mailchimp under **Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)**. This means:

- We can adapt and redistribute the guidance with attribution.
- Commercial use of the *original Mailchimp guide content* is restricted by Mailchimp's license.
- The JSON file in this repo is a derivative work and inherits the CC BY-NC 4.0 obligation for the rule descriptions and examples that originate from Mailchimp.
- The Content Vigilante codebase itself remains under the project's own license; only the Mailchimp-derived data file carries the CC BY-NC 4.0 restriction.

When shipping or demoing, attribute Mailchimp and link to https://styleguide.mailchimp.com/.

## Adding new guides

To add another brand's guide, create `<slug>.json` following the schema above and append a section here describing the source, extraction date, and license.
