import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyGuarantorInviteToken } from '@/lib/guarantor/invite';
import { createBillingRequestMandateFlow } from '@/lib/gocardless/billing-request-flow';

function appBaseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
}

function wantsJson(req: Request): boolean {
  const accept = req.headers.get('accept') ?? '';
  const contentType = req.headers.get('content-type') ?? '';
  return contentType.includes('application/json') || accept.includes('application/json');
}

function jsonOrRedirect(req: Request, url: string, extra: Record<string, unknown> = {}) {
  if (wantsJson(req)) {
    return NextResponse.json({ ok: true, authorisation_url: url, redirectUrl: url, ...extra });
  }
  return NextResponse.redirect(url);
}

async function createGuarantorBillingRequest(req: Request, body: Record<string, unknown>): Promise<Response> {
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
    return jsonOrRedirect(req, declinedUrl.toString());
  }

  const completeUrl = new URL(`/guarantor/review/${encodeURIComponent(id)}/complete`, appBaseUrl(req));
  completeUrl.searchParams.set('loanId', id);
  completeUrl.searchParams.set('email', guarantorEmail);
  completeUrl.searchParams.set('issuedAt', String(issuedAt ?? ''));
  completeUrl.searchParams.set('token', String(token ?? ''));

  const sandboxForced =
    process.env.PAYMENT_SANDBOX_MODE === 'true' || process.env.PAYMENT_SANDBOX_MODE === '1';

  if (sandboxForced) {
    completeUrl.searchParams.set('gocardless_stub', '1');
    return jsonOrRedirect(req, completeUrl.toString(), { stub: true });
  }

  try {
    const flow = await createBillingRequestMandateFlow({
      borrowerId: String(handshake.borrower_id),
      lenderId: String(handshake.lender_id),
      handshakeId: id,
      redirectUri: completeUrl.toString(),
      exitUri: completeUrl.toString(),
    });

    if (!flow.success || !flow.authorisation_url) {
      return NextResponse.json(
        { ok: false, error: flow.error ?? 'GoCardless did not return an authorisation URL.' },
        { status: 502 }
      );
    }

    return jsonOrRedirect(req, flow.authorisation_url, {
      billing_request_id: flow.billing_request_id,
      stub: flow.stub ?? false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GoCardless mandate setup failed';
    // Never leak raw XML/gateway bodies as an uncaught crash — always JSON.
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

async function parseRequestBody(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return (await req.json()) as Record<string, unknown>;
    } catch {
      throw new Error('Invalid JSON body. Expected Content-Type: application/json with a JSON payload.');
    }
  }

  // Legacy HTML form posts (application/x-www-form-urlencoded or multipart/form-data)
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

    // Also accept flat form fields
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
