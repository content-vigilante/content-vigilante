# @content-vigilante/cli

The `cv` command-line tool for [Content Vigilante](https://github.com/content-vigilante/Content-Vigilante) — patrols your content for off-brand violations.

> **Pre-alpha — `0.0.0`** · This is a placeholder publish to reserve the npm scope. Full v0.1 ships when the engine is complete (target: ~3 weeks).

## What this will do

```bash
npm install -g @content-vigilante/cli

# initialize a brand guide
cv init --guide ./brand-guidelines.pdf

# audit content
cv audit ./blog-post.md
cv audit https://yoursite.com/landing-page

# launch the local web UI
cv serve
```

See the [main README](https://github.com/content-vigilante/Content-Vigilante#readme) for the full design.

## License

MIT.
