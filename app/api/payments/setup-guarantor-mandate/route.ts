import { NextResponse } from 'next/server';
import gocardless from 'gocardless-nodejs';
import { Environments } from 'gocardless-nodejs/constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyGuarantorInviteToken } from '@/lib/guarantor/invite';

function appBaseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
}

const client = process.env.GOCARDLESS_ACCESS_TOKEN
  ? gocardless(
      process.env.GOCARDLESS_ACCESS_TOKEN,
      process.env.GOCARDLESS_ENVIRONMENT === 'live' ? Environments.Live : Environments.Sandbox
    )
  : null;

/**
 * Guarantor mandate setup — ALWAYS returns JSON.
 * The browser must then navigate with GET (never follow a 307 POST redirect to GoCardless).
 */
async function createGuarantorBillingRequest(
  req: Request,
  body: Record<string, unknown>
): Promise<Response> {
  const {
    loanId,
    email,
    token,
    issuedAt,
    action,
  } = body as {
    loanId?: string;
    email?: string;
    token?: string;
    issuedAt?: string;
    action?: string;
  };

  const id = loanId?.trim();
  const guarantorEmail = email?.trim().toLowerCase();
  if (!id || !guarantorEmail || !verifyGuarantorInviteToken(id, guarantorEmail, issuedAt, token)) {
    return NextResponse.json({ ok: false, error: 'Invalid or expired guarantor invite.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: handshake, error } = await admin
    .from('handshakes')
    .select('id, borrower_id, lender_id, amount, emi_amount, guarantor_email, guarantor_status')
    .eq('id', id)
    .maybeSingle();

  if (error || !handshake) {
    return NextResponse.json({ ok: false, error: 'Loan not found.' }, { status: 404 });
  }

  if ((handshake.guarantor_email as string | null)?.toLowerCase() !== guarantorEmail) {
    return NextResponse.json({ ok: false, error: 'Guarantor email does not match this invite.' }, { status: 403 });
  }

  if ((action ?? 'accept') === 'decline') {
    const { error: declineError } = await admin
      .from('handshakes')
      .update({ guarantor_status: 'rejected' })
      .eq('id', id);

    if (declineError) {
      return NextResponse.json({ ok: false, error: declineError.message }, { status: 500 });
    }

    const declinedUrl = new URL(`/guarantor/review/${encodeURIComponent(id)}`, appBaseUrl(req));
    declinedUrl.searchParams.set('status', 'declined');
    declinedUrl.searchParams.set('email', guarantorEmail);
    declinedUrl.searchParams.set('issuedAt', String(issuedAt ?? ''));
    declinedUrl.searchParams.set('token', String(token ?? ''));
    return NextResponse.json({ ok: true, redirectUrl: declinedUrl.toString() });
  }

  const completeUrl = new URL(`/guarantor/review/${encodeURIComponent(id)}/complete`, appBaseUrl(req));
  completeUrl.searchParams.set('loanId', id);
  completeUrl.searchParams.set('email', guarantorEmail);
  completeUrl.searchParams.set('issuedAt', String(issuedAt ?? ''));
  completeUrl.searchParams.set('token', String(token ?? ''));

  const sandboxForced =
    !client ||
    process.env.PAYMENT_SANDBOX_MODE === 'true' ||
    process.env.PAYMENT_SANDBOX_MODE === '1';

  if (sandboxForced) {
    completeUrl.searchParams.set('gocardless_stub', '1');
    return NextResponse.json({
      ok: true,
      stub: true,
      authorisation_url: completeUrl.toString(),
      redirectUrl: completeUrl.toString(),
    });
  }

  try {
    // Same shape as /api/payments/setup-mandate (borrower) — proven path.
    const billingRequest = await client!.billingRequests.create({
      mandate_request: {
        currency: 'GBP',
      },
      metadata: {
        handshake_id: id.slice(0, 50),
        role: 'guarantor',
        guarantor_email: guarantorEmail.slice(0, 50),
      },
    });

    completeUrl.searchParams.set('billingRequestId', billingRequest.id);

    const flow = await client!.billingRequestFlows.create({
      redirect_uri: completeUrl.toString(),
      exit_uri: completeUrl.toString(),
      links: {
        billing_request: billingRequest.id,
      },
    });

    if (!flow.authorisation_url) {
      return NextResponse.json(
        { ok: false, error: 'GoCardless did not return an authorisation URL.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      authorisation_url: flow.authorisation_url,
      redirectUrl: flow.authorisation_url,
      billing_request_id: billingRequest.id,
      billing_request_flow_id: flow.id,
    });
  } catch (error) {
    console.error('[setup-guarantor-mandate] GoCardless error:', error);
    const message = error instanceof Error ? error.message : 'GoCardless mandate setup failed';
    // Always JSON — never leak raw XML gateway bodies as an uncaught response.
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

async function parseRequestBody(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return (await req.json()) as Record<string, unknown>;
    } catch {
      throw new Error('Invalid JSON body. Expected Content-Type: application/json.');
    }
  }

  // Legacy form posts still supported, but we only ever reply with JSON (no redirect).
  try {
    const formData = await req.formData();
    const payload = formData.get('payload');
    let parsed: Record<string, unknown> = {};

    if (typeof payload === 'string' && payload.trim()) {
      try {
        parsed = JSON.parse(payload) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
    }

    const action = formData.get('action');
    if (typeof action === 'string' && action.trim()) {
      parsed.action = action.trim();
    }

    for (const key of ['loanId', 'email', 'token', 'issuedAt'] as const) {
      const value = formData.get(key);
      if (typeof value === 'string' && value.trim() && parsed[key] == null) {
        parsed[key] = value.trim();
      }
    }

    return parsed;
  } catch {
    throw new Error('Could not parse request body. Send JSON with Content-Type: application/json.');
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseRequestBody(req);
    return await createGuarantorBillingRequest(req, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process guarantor invite';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
