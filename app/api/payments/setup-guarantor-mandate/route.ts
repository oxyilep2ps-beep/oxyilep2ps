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
    .select('id, borrower_id, amount, emi_amount, guarantor_email, guarantor_status')
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

    const declinedUrl = new URL(`/guarantor/invite/${encodeURIComponent(id)}`, appBaseUrl(req));
    declinedUrl.searchParams.set('status', 'declined');
    declinedUrl.searchParams.set('email', guarantorEmail);
    declinedUrl.searchParams.set('issuedAt', String(issuedAt ?? ''));
    declinedUrl.searchParams.set('token', String(token ?? ''));
    return NextResponse.redirect(declinedUrl);
  }

  // Keep status as invited until mandate completion confirms acceptance.
  const sandboxOnly = !client || process.env.PAYMENT_SANDBOX_MODE === 'true' || process.env.PAYMENT_SANDBOX_MODE === '1';

  if (sandboxOnly) {
    const completeUrl = new URL(`/guarantor/invite/${encodeURIComponent(id)}/complete`, appBaseUrl(req));
    completeUrl.searchParams.set('loanId', id);
    completeUrl.searchParams.set('email', guarantorEmail);
    completeUrl.searchParams.set('issuedAt', String(issuedAt ?? ''));
    completeUrl.searchParams.set('token', String(token ?? ''));
    completeUrl.searchParams.set('gocardless_stub', '1');
    return NextResponse.redirect(completeUrl);
  }

  const billingRequest = await client!.billingRequests.create({
    mandate_request: {
      currency: 'GBP',
    },
  });

  const redirectUrl = new URL(`/guarantor/invite/${encodeURIComponent(id)}/complete`, appBaseUrl(req));
  redirectUrl.searchParams.set('loanId', id);
  redirectUrl.searchParams.set('email', guarantorEmail);
  redirectUrl.searchParams.set('issuedAt', String(issuedAt ?? ''));
  redirectUrl.searchParams.set('token', String(token ?? ''));
  redirectUrl.searchParams.set('billingRequestId', billingRequest.id);

  const flow = await client!.billingRequestFlows.create({
    redirect_uri: redirectUrl.toString(),
    links: {
      billing_request: billingRequest.id,
    },
  });

  if (!flow.authorisation_url) {
    return NextResponse.json({ ok: false, error: 'GoCardless did not return an authorisation URL.' }, { status: 502 });
  }

  return NextResponse.redirect(flow.authorisation_url);
}

async function parseRequestBody(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await req.json()) as Record<string, unknown>;
  }

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

  return parsed;
}

export async function POST(req: Request) {
  try {
    const body = await parseRequestBody(req);
    return await createGuarantorBillingRequest(req, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process guarantor invite';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}