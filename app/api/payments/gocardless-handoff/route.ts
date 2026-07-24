import { NextResponse } from 'next/server';

/**
 * Safe GET → 303 GET handoff into GoCardless hosted flows.
 * Never accept POST here — that is what triggers:
 * "POST object expects Content-Type multipart/form-data" on pay-sandbox.gocardless.com.
 */
function isAllowedGoCardlessUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    return (
      url.hostname === 'pay-sandbox.gocardless.com' ||
      url.hostname === 'pay.gocardless.com' ||
      url.hostname.endsWith('.gocardless.com')
    );
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const to = new URL(req.url).searchParams.get('to')?.trim() ?? '';
  if (!to || !isAllowedGoCardlessUrl(to)) {
    return NextResponse.json(
      { ok: false, error: 'Missing or invalid GoCardless authorisation URL.' },
      { status: 400 }
    );
  }

  // 303 forces the browser to continue with GET (never POST).
  return NextResponse.redirect(to, { status: 303 });
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        'This endpoint only accepts GET. Open the GoCardless flow via a GET navigation, not a form POST.',
    },
    { status: 405 }
  );
}
