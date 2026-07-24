import { NextResponse } from 'next/server';
import gocardless from 'gocardless-nodejs';
import { Environments } from 'gocardless-nodejs/constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyGuarantorInviteToken } from '@/lib/guarantor/invite';

function getGoCardlessBaseUrl(): string {
  return process.env.GOCARDLESS_ENVIRONMENT === 'live'
    ? 'https://api.gocardless.com'
    : 'https://api-sandbox.gocardless.com';
}

const client = process.env.GOCARDLESS_ACCESS_TOKEN
  ? gocardless(
      process.env.GOCARDLESS_ACCESS_TOKEN,
      process.env.GOCARDLESS_ENVIRONMENT === 'live' ? Environments.Live : Environments.Sandbox
    )
  : null;

function findMandateId(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.startsWith('MD') ? value : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findMandateId(item);
      if (match) return match;
    }
    return null;
  }

  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  for (const [key, item] of Object.entries(record)) {
    if (key.toLowerCase().includes('mandate')) {
      const match = findMandateId(item);
      if (match) return match;
    }
  }

  for (const item of Object.values(record)) {
    const match = findMandateId(item);
    if (match) return match;
  }

  return null;
}

async function getBillingRequest(billingRequestId: string): Promise<unknown> {
  if (client?.billingRequests?.find) {
    return client.billingRequests.find(billingRequestId);
  }

  const token = process.env.GOCARDLESS_ACCESS_TOKEN;
  if (!token) throw new Error('GOCARDLESS_ACCESS_TOKEN is not configured');

  const response = await fetch(`${getGoCardlessBaseUrl()}/billing_requests/${billingRequestId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'GoCardless-Version': '2015-04-29',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not verify guarantor mandate: ${response.status} ${text}`);
  }

  return response.json() as Promise<unknown>;
}

async function completeGuarantorMandate(params: {
  loanId: string;
  email: string;
  token: string;
  issuedAt: string;
  billingRequestId?: string;
  stub?: boolean;
}): Promise<{ mandateId: string }> {
  const admin = createAdminClient();
  const { data: handshake, error } = await admin
    .from('handshakes')
    .select('id, guarantor_email, guarantor_status')
    .eq('id', params.loanId)
    .maybeSingle();

  if (error || !handshake) {
    throw new Error('Loan not found');
  }

  if ((handshake.guarantor_email as string | null)?.toLowerCase() !== params.email.toLowerCase()) {
    throw new Error('Guarantor email does not match this invite');
  }

  if (!verifyGuarantorInviteToken(params.loanId, params.email, params.issuedAt, params.token)) {
    throw new Error('Invalid or expired guarantor invite');
  }

  const mandateId = params.stub
    ? `MD_GUARANTOR_${params.loanId.slice(0, 8)}_${Date.now()}`
    : (() => {
        if (!params.billingRequestId) {
          throw new Error('GoCardless billing request reference missing');
        }
        return '';
      })();

  let resolvedMandateId = mandateId;
  if (!params.stub) {
    const body = await getBillingRequest(params.billingRequestId as string);
    const found = findMandateId(body);
    if (!found) {
      throw new Error(`No active GoCardless mandate found for billing request ${params.billingRequestId}`);
    }
    resolvedMandateId = found;
  }

  // Link guarantor auth user when an account already exists for this email.
  const { data: guarantorProfile } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', params.email)
    .maybeSingle();

  const { error: updateError } = await admin
    .from('handshakes')
    .update({
      guarantor_status: 'accepted',
      guarantor_mandate_id: resolvedMandateId,
      guarantor_user_id: (guarantorProfile?.id as string | undefined) ?? null,
    })
    .eq('id', params.loanId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { mandateId: resolvedMandateId };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      loanId?: string;
      email?: string;
      token?: string;
      issuedAt?: string;
      billingRequestId?: string;
      gocardless_stub?: boolean;
    };

    const loanId = body.loanId?.trim();
    const email = body.email?.trim().toLowerCase();
    if (!loanId || !email || !body.token || !body.issuedAt) {
      return NextResponse.json({ ok: false, error: 'Missing guarantor completion data' }, { status: 400 });
    }

    const result = await completeGuarantorMandate({
      loanId,
      email,
      token: body.token,
      issuedAt: body.issuedAt,
      billingRequestId: body.billingRequestId,
      stub: Boolean(body.gocardless_stub),
    });

    return NextResponse.json({ ok: true, mandateId: result.mandateId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete guarantor mandate';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}