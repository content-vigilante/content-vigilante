import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vercel cron endpoint for scheduled publishing.
// When token storage moves from per-browser cookies to per-user KV records (v1.3):
//   1. Loop users in KV set "cv:users".
//   2. Read scheduled-post queue for each user.
//   3. Filter posts where scheduledFor <= now and status === scheduled.
//   4. Read their stored platform tokens (linkedin, x).
//   5. Call the platform API directly (do not call the cookie-bound publish routes).
//   6. Mark each post as published on success.
// Until that lands, scheduled posts publish via the browser action on /dashboard/calendar.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    note: 'Cron stub. Scheduled publishing currently runs from the user browser.',
    timestamp: new Date().toISOString(),
  });
}
