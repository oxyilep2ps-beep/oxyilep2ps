import { NextResponse } from 'next/server';
import gocardless from 'gocardless-nodejs';
import { Environments } from 'gocardless-nodejs/constants';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { executeHandshake } from '@/app/actions/handshake';
import { createMonthlyEmiSubscription } from '@/lib/gocardless/subscriptions';
import { calculateHandshakeFigures } from '@/lib/handshake/calculations';

function getGoCardlessBaseUrl(): string {
  return process.env.GOCARDLESS_ENVIRONMENT === 'live'
    ? 'https://api.gocardless.com'
    : 'https://api-sandbox.gocardless.com';
}

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

const goCardlessClient = gocardless(
  process.env.GOCARDLESS_ACCESS_TOKEN ?? '',
  process.env.GOCARDLESS_ENVIRONMENT === 'live' ? Environments.Live : Environments.Sandbox
);

type GoCardlessBillingRequestShape = {
  id?: string;
  links?: {
    mandate_request_mandate?: string;
    customer_billing_detail?: string;
    customer_bank_account?: string;
    [key: string]: unknown;
  };
  mandate_request?: {
    links?: {
      mandate?: string;
      [key: string]: unknown;
    };
  };
  [key: string]: unknown;
};

async function getBillingRequestViaSdk(billingRequestId: string): Promise<unknown | null> {
  const api = goCardlessClient as unknown as {
    billingRequests?: {
      find?: (id: string) => Promise<GoCardlessBillingRequestShape>;
      get?: (id: string) => Promise<GoCardlessBillingRequestShape>;
      retrieve?: (id: string) => Promise<GoCardlessBillingRequestShape>;
    };
  };

  const billingRequests = api.billingRequests;
  if (!billingRequests) return null;

  if (typeof billingRequests.find === 'function') {
    return billingRequests.find(billingRequestId);
  }
  if (typeof billingRequests.get === 'function') {
    return billingRequests.get(billingRequestId);
  }
  if (typeof billingRequests.retrieve === 'function') {
    return billingRequests.retrieve(billingRequestId);
  }

  return null;
}

async function getBillingRequestViaHttp(token: string, billingRequestId: string): Promise<unknown> {
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
    throw new Error(`Could not verify GoCardless mandate: ${response.status} ${text}`);
  }

  return (await response.json()) as unknown;
}

async function resolveMandateId(params: {
  explicitMandateId?: string;
  billingRequestId?: string;
  userId: string;
  handshakeId: string;
  stub?: boolean;
}): Promise<string> {
  if (params.explicitMandateId) return params.explicitMandateId;

  const token = process.env.GOCARDLESS_ACCESS_TOKEN;
  if (!token || params.stub) {
    return `MD_STUB_${params.userId.slice(0, 8)}_${Date.now()}`;
  }

  if (!params.billingRequestId) {
    throw new Error('GoCardless billing request reference missing');
  }

  // Preferred path: official SDK (handles API versioning internally).
  const body =
    (await getBillingRequestViaSdk(params.billingRequestId)) ??
    (await getBillingRequestViaHttp(token, params.billingRequestId));
  const mandateId = findMandateId(body);

  if (!mandateId) {
    throw new Error(`No active GoCardless mandate found for billing request ${params.billingRequestId}`);
  }

  return mandateId;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      handshakeId: string;
      mandateId?: string;
      billingRequestId?: string;
      redirectFlowId?: string;
      stub?: boolean;
    };

    if (!body.handshakeId) {
      return NextResponse.json({ ok: false, error: 'handshakeId required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: handshake, error: hsError } = await admin
      .from('handshakes')
      .select('*')
      .eq('id', body.handshakeId)
      .eq('borrower_id', user.id)
      .maybeSingle();

    if (hsError || !handshake) {
      return NextResponse.json({ ok: false, error: 'Handshake not found' }, { status: 404 });
    }

    if (!handshake.lender_approved_at || !handshake.borrower_approved_at) {
      return NextResponse.json({ ok: false, error: 'Both parties must approve first' }, { status: 400 });
    }

    void body.redirectFlowId;

    const mandateId = await resolveMandateId({
      explicitMandateId: body.mandateId,
      billingRequestId: body.billingRequestId,
      userId: user.id,
      handshakeId: body.handshakeId,
      stub: body.stub,
    });

    const { error: mandateUpsertError } = await admin.from('gocardless_mandates').upsert({
      user_id: user.id,
      mandate_id: mandateId,
      status: 'active',
      handshake_id: body.handshakeId,
      updated_at: new Date().toISOString(),
    });

    if (mandateUpsertError) {
      throw new Error(mandateUpsertError.message);
    }

    const figures = calculateHandshakeFigures(
      Number(handshake.amount ?? 0),
      Number(handshake.rate ?? 0),
      Number(handshake.duration ?? 1)
    );
    const emi = figures.emi_amount;
    const totalReturn = figures.total_return;
    const amountPence = Math.max(1, Math.round(emi * 100));

    if (!Number.isFinite(emi) || emi <= 0 || !Number.isFinite(totalReturn) || totalReturn <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid EMI amount for subscription' }, { status: 400 });
    }

    const { error: figuresUpdateError } = await admin
      .from('handshakes')
      .update({
        emi_amount: emi,
        total_return: totalReturn,
      })
      .eq('id', body.handshakeId);

    if (figuresUpdateError) {
      throw new Error(figuresUpdateError.message);
    }

    const mint = await executeHandshake(
      handshake.lender_id as string,
      handshake.borrower_id as string,
      body.handshakeId
    );

    const sub = await createMonthlyEmiSubscription({
      mandateId,
      amountPence,
      name: `Oxyile EMI — ${body.handshakeId.slice(0, 8)}`,
      handshakeId: body.handshakeId,
      totalPayments: Math.max(1, Math.round(Number(handshake.duration ?? 12))),
    });

    if (!sub.success || !sub.subscription_id) {
      const { error: pendingUpdateError } = await admin
        .from('handshakes')
        .update({
          payment_status: 'PENDING',
          auto_emi_active: false,
        })
        .eq('id', body.handshakeId);

      if (pendingUpdateError) {
        throw new Error(pendingUpdateError.message);
      }

      return NextResponse.json(
        { ok: false, error: sub.error ?? 'Subscription creation failed', polygonTxHash: mint.polygonTxHash },
        { status: 502 }
      );
    }

    const { error: activeUpdateError } = await admin
      .from('handshakes')
      .update({
        gocardless_subscription_id: sub.subscription_id,
        payment_status: 'ACTIVE',
        auto_emi_active: true,
      })
      .eq('id', body.handshakeId);

    if (activeUpdateError) {
      throw new Error(activeUpdateError.message);
    }

    return NextResponse.json({
      ok: true,
      polygonTxHash: mint.polygonTxHash,
      subscription_id: sub.subscription_id,
      sandbox: mint.sandbox,
      bank_linked: true,
      contract_minted: true,
      auto_emi_active: sub.success,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Completion failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
