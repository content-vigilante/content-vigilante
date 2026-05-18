# Launch checklist (v2.5)

Two URLs are live:

| URL | Mode | Use |
|---|---|---|
| https://content-vigilante-vercel.vercel.app | **Production** — clean slate every device | The real app. New users start empty. |
| https://content-vigilante-demo.vercel.app | **Demo** — seeded with mock posts/leads/campaigns | Show-off / pitch / Product Hunt link. A green pill in the corner reminds visitors. |

Both deploy from the same `main` branch. Only difference: `NEXT_PUBLIC_CV_DEMO_MODE=1` on demo.

## Already done

- ✅ Three encrypted secrets set across Production + Preview + Development on the prod project:
  - `CRON_SECRET` (48 chars)
  - `CV_COOKIE_SECRET` (48 chars)
  - `AUTH_SECRET` (48 chars)
- ✅ Vercel cron `0 9 * * *` → `/api/cron/publish` (Hobby plan limit; upgrade to Pro for `*/15 * * * *`)
- ✅ Demo deployment with mock data
- ✅ Production deployment boots clean for every user

## What you (Sai) still need to do

### 1. Vercel KV (3 minutes — required for sync + server cron)
1. https://vercel.com/dashboard → Storage → Create → **KV (Upstash Redis)**.
2. Name it `content-vigilante-kv`. Region: Frankfurt (closest to Bologna).
3. Connect to both projects: `content-vigilante-vercel` AND `content-vigilante-demo`.
4. Vercel auto-injects `KV_REST_API_URL` + `KV_REST_API_TOKEN` env vars.
5. Hit "Redeploy" on each project (or push any commit) so the new env vars flow in.

Test it works:
```bash
curl -X POST https://content-vigilante-vercel.vercel.app/api/sync \
  -H "x-cv-sync-token: $(openssl rand -hex 16)$(openssl rand -hex 16)" \
  -H "content-type: application/json" \
  -d '{"data":{"test":true}}'
```
Response should include `"adapter":"kv"`. If you see `"adapter":"memory"`, KV isn't connected.

### 2. LinkedIn OAuth (10 minutes)
1. https://www.linkedin.com/developers → My apps → **Create app**.
2. Auth tab → Authorized redirect URLs → add:
   - `https://content-vigilante-vercel.vercel.app/api/linkedin/callback`
3. Products → request **Share on LinkedIn** + **Sign In with LinkedIn using OpenID Connect**.
4. Auth tab → copy Client ID + Client Secret.
5. Vercel → `content-vigilante-vercel` → Settings → Environment Variables:
   - `LINKEDIN_CLIENT_ID` = (client id)
   - `LINKEDIN_CLIENT_SECRET` = (client secret)
6. Redeploy.
7. Visit `/api/linkedin/connect` once → you're connected.

### 3. X (Twitter) OAuth 2.0 (10 minutes)
1. https://developer.x.com → Projects & Apps → **Add App**.
2. User authentication settings:
   - Type: **OAuth 2.0**
   - App permissions: Read + Write
   - Callback URI: `https://content-vigilante-vercel.vercel.app/api/x/callback`
   - Website URL: `https://content-vigilante-vercel.vercel.app`
3. Keys & tokens → OAuth 2.0 Client ID + Client Secret.
4. Vercel env vars:
   - `X_CLIENT_ID`
   - `X_CLIENT_SECRET`
5. Redeploy.
6. Visit `/api/x/connect`.

### 4. Meta (Facebook + Instagram) (15 minutes)
1. https://developers.facebook.com → My Apps → **Create App** → Business type.
2. Add **Facebook Login** + **Instagram Graph API** products.
3. Facebook Login → Settings → Valid OAuth Redirect URIs:
   - `https://content-vigilante-vercel.vercel.app/api/meta/callback`
4. Permissions you'll need (request in App Review when you go live):
   - `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`
   - `instagram_basic`, `instagram_content_publish`, `business_management`
5. Settings → Basic → copy App ID + App Secret.
6. Vercel env vars:
   - `META_CLIENT_ID`
   - `META_CLIENT_SECRET`
7. Redeploy.
8. Visit `/api/meta/connect`. Your first Page + IG biz account get auto-linked.

### 5. Google Analytics 4 (10 minutes)
1. https://console.cloud.google.com → APIs & Services → **Enable Google Analytics Data API**.
2. Credentials → Create Credentials → **OAuth 2.0 Client ID** → Web application.
3. Authorized redirect URI:
   - `https://content-vigilante-vercel.vercel.app/api/ga4/callback`
4. Copy Client ID + Client Secret.
5. Vercel env vars:
   - `GA4_CLIENT_ID`
   - `GA4_CLIENT_SECRET`
6. Redeploy.
7. Visit `/api/ga4/connect`, then on the Analytics page paste your GA4 Property ID
   (format: `properties/123456789`).

### 6. NextAuth Google sign-in (optional, 5 minutes)
Only if you want named accounts.

1. Same GCP project as GA4 → create another OAuth 2.0 Client ID (or reuse).
2. Authorized redirect URI:
   - `https://content-vigilante-vercel.vercel.app/api/auth/callback/google`
3. Vercel env vars:
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `AUTH_SECRET` is already set
4. Redeploy. The "Sign in with Google" button on Settings activates.

### 7. Custom domain (optional)
Vercel → `content-vigilante-vercel` → Settings → Domains → Add `contentvigilante.com` or your own. Same for the demo project under e.g. `demo.contentvigilante.com`.

## Sanity check

After each step, hit the Settings → Connections panel — that integration row should switch from
**not configured** (warn pill) to **Connect** button, then to **connected** (green pill) after
the OAuth round-trip.

## Order I'd do it in

1. **KV** first — unlocks everything else.
2. **Meta** next — single OAuth gets you both Facebook publishing AND Instagram publishing. Highest-value integration per minute spent.
3. **LinkedIn** — same effort, big audience.
4. **GA4** — turns the Analytics page from mocked to live.
5. **X** — quickest to set up, smallest payoff.
6. **NextAuth + custom domain** — only when you're ready to share publicly.

Each one is independent. The app keeps working even if you only do KV + Meta.
