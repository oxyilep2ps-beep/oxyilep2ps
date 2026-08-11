import { NextResponse } from 'next/server';
import { cleanUpStorageMedia } from '@/lib/social/ghost-cleanup';

/**
 * Make.com final-module callback for Ghost Storage cleanup.
 *
 * GET  /api/webhooks/cleanup?url=<publicUrl>&campaignId=<uuid>
 * POST /api/webhooks/cleanup  { "url": "...", "campaignId": "..." }
 *
 * Optional auth: Authorization: Bearer <SOCIAL_CLEANUP_WEBHOOK_SECRET>
 *             or ?secret=<SOCIAL_CLEANUP_WEBHOOK_SECRET>
 */
function assertCleanupSecret(request: Request, url: URL): NextResponse | null {
  const expected = process.env.SOCIAL_CLEANUP_WEBHOOK_SECRET?.trim();
  if (!expected) return null; // open if unset (matches social-metrics pattern)

  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const querySecret = url.searchParams.get('secret')?.trim();
  if (bearer === expected || querySecret === expected) return null;

  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
}

async function runCleanup(fileUrl: string | null, campaignId: string | null) {
  if (!fileUrl?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Missing url. Pass ?url= or JSON { url }.' },
      { status: 400 }
    );
  }

  const result = await cleanUpStorageMedia(fileUrl, {
    campaignId: campaignId?.trim() || undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    path: result.path,
    campaignId: result.campaignId ?? null,
    message: 'Ghost storage cleanup complete. Campaign metadata retained.',
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const denied = assertCleanupSecret(request, url);
    if (denied) return denied;

    return runCleanup(url.searchParams.get('url'), url.searchParams.get('campaignId'));
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Cleanup webhook failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const denied = assertCleanupSecret(request, url);
    if (denied) return denied;

    let body: { url?: string; image_url?: string; campaignId?: string; campaign_id?: string } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }

    const fileUrl = body.url ?? body.image_url ?? url.searchParams.get('url');
    const campaignId =
      body.campaignId ?? body.campaign_id ?? url.searchParams.get('campaignId');

    return runCleanup(fileUrl ?? null, campaignId ?? null);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Cleanup webhook failed',
      },
      { status: 500 }
    );
  }
}
