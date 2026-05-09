# @content-vigilante/cli

The `cv` command-line tool for [Content Vigilante](https://github.com/content-vigilante/Content-Vigilante) — patrols your content for off-brand violations.

> **Pre-alpha — `0.0.0`** · Core audit, URL/text extraction, and local web UI wiring are in progress.

## Usage

```bash
bun install

# initialize a brand guide
cv init --guide ./brand-guidelines.md

# audit content
cv audit ./blog-post.md
cv audit https://yoursite.com/landing-page

# launch the local web UI
cv serve
cv serve --port 4000 --host 0.0.0.0
```

`cv audit` defaults to the bundled Mailchimp guide and auto-detects Anthropic, OpenAI, or Ollama from your environment.

`cv serve` runs the Next.js app in `packages/web` and prints the local URL.

See the [main README](https://github.com/content-vigilante/Content-Vigilante#readme) for the full design.

## License

MIT.
