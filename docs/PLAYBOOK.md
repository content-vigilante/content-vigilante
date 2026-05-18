# How agencies and brands use Content Vigilante

A working playbook. Pick the section that matches you.

---

## 1. Marketing agency (freelancer or 2–20 person shop)

You manage 3–20 clients. Each has different voice, channels, cadence. You spend
20% of your week context-switching.

### Setup once
1. **Workspace per client** — Settings → Workspaces → "+ Add" for each.
2. **Brand guide per workspace** — Guardrails → Upload PDF. Extracted rules
   replace the bundled Mailchimp default for that workspace only.
3. **Provider key** — Anthropic or OpenAI, set once on Guardrails.
4. **Sync token** — Settings → Cross-device sync → Generate → paste it on every
   device you work from. (Or keep it local-only.)
5. **Slack hook** — Settings → Notifications → paste your team Slack incoming
   webhook. Pick events: publish, watchlist, hot lead.
6. **Time tracker** — bottom-right widget. Start a "Creation" timer when you
   begin client work, "Engagement" when you're replying to comments.

### Day-to-day
- **Monday strategy** → drop the client's latest research/transcripts in Context,
  hit "Suggest 5 ideas." Drag the best 4 into Calendar for the week.
- **Tuesday production** → Studio writes drafts; brand guardrails enforce voice;
  Asset audit checks creative against the brand palette.
- **Wednesday review** → Exports → Share portal generates `/share/<token>`.
  Paste to client. They approve in their browser, no account needed.
- **Thu–Fri publishing** → Cron handles it. Slack pings the team channel when
  posts go out. Watchlist pings if a competitor changes their pricing page.
- **End of month** → Exports → Invoice generator. The hours come from your time
  tracker. Print to PDF, send.

### Features that matter most to agencies
- Multi-workspace
- Per-client brand guides
- Client approval portal (already there)
- Time tracker → invoice handoff (already there)
- Notifications to Slack (v2.3)
- Asset audit (v2.3) — alt-text on every image asset is a real billable line

### What's still missing for agencies (v2.4+ wishlist)
- White-label the share portal (your logo, not the owl)
- Per-client hourly rate (today the invoice has one global rate)
- Roles: junior writer can save drafts but not publish
- Campaign tagging across posts + leads + hours so monthly reports roll up
- Auto-send the weekly digest to each client on a cron

---

## 2. Brand / in-house marketing team

You're 2–10 people inside one company. Multiple writers, one voice. You ship
content across LinkedIn, the newsletter, the blog, and need attribution back.

### Setup once
1. **One workspace** with the company brand guide on Guardrails.
2. **Provider key + sync token** — share the token over 1Password so your team
   all sees the same state on every device.
3. **NextAuth sign-in** (optional) — set `AUTH_GOOGLE_ID/SECRET` on Vercel and
   each teammate signs in with their company Google account.
4. **GA4** — connect on Settings. Drop your property ID on Analytics for live
   Users / Sessions / Pageviews / Engagement.
5. **Dark social tracker** — paste the one-line snippet from the Analytics card
   into your site's `<head>`.
6. **Slack** — alerts go to the marketing channel for publishes and inbox
   activity.
7. **Watchlist** — add 3 main competitors' homepages and pricing pages.

### Day-to-day
- **Editorial planning** → Context library holds the product team's research,
  customer interview transcripts, support ticket exports. Suggest pulls ideas
  the team would never think of in a workshop.
- **Writing** → every writer drafts in Studio. Headline scorecard, SEO density,
  bias detector run live. Brand guardrails block off-voice drafts.
- **Creative review** → designer uploads to Asset audit. Auto alt-text for
  accessibility. Brand-palette check before it goes to social.
- **Approval workflow** → (today: informal via share portal; v2.4: legal must
  approve before "Publish" lights up).
- **Community management** → Inbox aggregates LinkedIn / IG / X / FB / newsletter
  replies. One click converts a hot reply to a CRM lead.
- **Reporting** → Analytics with live GA4 + dark social + correlation engine.
  Watchlist tells you when a competitor moves.

### Features that matter most to brands
- Brand guardrails as a hard gate, not a suggestion
- Multi-user sync (auth + KV)
- Inbox to CRM conversion
- GA4 + dark social
- Slack alerts on publish + hot lead

### What's still missing for brands (v2.4+ wishlist)
- Approval gate before publish (writer drafts → reviewer approves → cron publishes)
- Sentiment buckets in Inbox (complaints / praise / leads)
- Campaign view — roll posts + leads + ad spend into one campaign card
- Per-role permissions
- Webhook on lead.hot → push into your real CRM (HubSpot/Pipedrive/Salesforce)

---

## 3. Solo creator / founder (the "personal brand" use case)

You're one person posting under your own name. You don't need a team feature, you
need the AI scaffolding so quality stays high while volume goes up.

### Use it like this
- Context = your podcast transcripts, your tweet drafts, books you're reading.
- Suggest 5 ideas every Sunday night → calendar fills itself.
- Studio for every draft. Brand guardrails = your own voice.
- Time tracker shows you exactly how many hours go into engagement vs creation
  (most founders are surprised it's a 1:1 ratio).
- Pipeline kanban tracks deals from your DMs all the way to "closed."
- Invoice generator for the consulting work that comes off the back of all this.

---

## A quick map of which feature → which job

| Job to be done | Feature |
|---|---|
| Stay on-brand at scale | **Guardrails**, **PDF guide ingest**, **Studio inline check** |
| Stop staring at a blank page | **Context library + Suggest** |
| Publish everywhere without context-switching | **Calendar + server cron + Studio** |
| Show clients what's coming | **Exports → share portal** |
| Bill clients accurately | **Time tracker + Invoice generator** |
| Get told when stuff happens | **Slack / Discord webhooks** (v2.3) |
| Check creative before it ships | **Asset audit** (v2.3) |
| Know what competitors are doing | **Watchlist** |
| Find the traffic GA4 hides | **Dark social tracker** |
| Convert replies into deals | **Inbox → To CRM → Pipeline** |
| Prove ROI | **Analytics (live GA4) + ROI card** |
