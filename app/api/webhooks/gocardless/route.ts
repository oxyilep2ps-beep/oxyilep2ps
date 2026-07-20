import { NextResponse } from 'next/server';
import gocardless from 'gocardless-nodejs';
import { Environments } from 'gocardless-nodejs/constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { executeWeb3Transaction } from '@/lib/web3/execute-web3-transaction';

const client = process.env.GOCARDLESS_ACCESS_TOKEN
  ? gocardless(
      process.env.GOCARDLESS_ACCESS_TOKEN,
      process.env.GOCARDLESS_ENVIRONMENT === 'live' ? Environments.Live : Environments.Sandbox
    )
  : null;

type GoCardlessWebhookBody = {
  events?: Array<{
    action?: string;
    resource_type?: string;
    links?: Record<string, string>;
    details?: Record<string, unknown>;
  }>;
};

function isFailedPaymentAction(action?: string): boolean {
  if (!action) return false;
  const normalized = action.toLowerCase();
  return normalized.includes('fail') || normalized.includes('returned') || normalized.includes('dishonour');
}

function toGoCardlessAmountPence(amountGbp: number): number {
  return Math.round(Number(amountGbp) * 100);
}

async function createGuarantorFallbackPayment(params: {
  handshakeId: string;
  originalPaymentId?: string;
  mandateId: string;
  amountGbp: number;
}): Promise<{ success: boolean; paymentId?: string; error?: string; stub?: boolean }> {
  const amountPence = toGoCardlessAmountPence(params.amountGbp);
  if (!Number.isFinite(amountPence) || amountPence < 100) {
    return { success: false, error: 'Guarantor fallback amount must be at least £1.00.' };
  }

  const token = process.env.GOCARDLESS_ACCESS_TOKEN;
  if (!token || !client) {
    return {
      success: true,
      stub: true,
      paymentId: `GUARANTOR_STUB_${params.handshakeId.slice(0, 8)}_${Date.now()}`,
    };
  }

  try {
    const body = {
      payments: {
        amount: amountPence,
        currency: 'GBP',
        links: { mandate: params.mandateId },
        metadata: {
          handshake_id: params.handshakeId,
          original_payment_id: params.originalPaymentId ?? '',
          trigger_reason: 'Guarantor Triggered Payment',
          platform: 'oxyile',
        },
      },
    };

    const api = client as unknown as {
      payments?: { create?: (payload: Record<string, unknown>) => Promise<{ id: string }> };
    };

    if (typeof api.payments?.create === 'function') {
      const payment = await api.payments.create(body);
      return { success: true, paymentId: payment.id };
    }

    const response = await fetch(`${process.env.GOCARDLESS_ENVIRONMENT === 'live' ? 'https://api.gocardless.com' : 'https://api-sandbox.gocardless.com'}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'GoCardless-Version': '2015-07-06',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GoCardless ${response.status}: ${text}`);
    }

    const json = (await response.json()) as { payments?: { id?: string } };
    return { success: true, paymentId: json.payments?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Guarantor payment creation failed' };
  }
}

/**
 * Escrow payout policy (Client Money Account / AML):
 * -------------------------------------------------
 * Incoming GoCardless payments land in Oxyile's segregated Client Money Account.
 * Funds are NOT released to the borrower's nominated bank until:
 *   1. Payment clears AML/sanctions screening on the Client Money Account, AND
 *   2. The matching handshake ledger is updated on-chain (UPDATE_EMI_PAID), AND
 *   3. Admin treasury confirms available settled balance for disbursement.
 * This webhook only records payment_id and triggers the on-chain EMI ledger update.
 */
async function handlePaymentSuccess(paymentId: string): Promise<{ handshakeId: string | null }> {
  const admin = createAdminClient();

  const { data: handshake, error } = await admin
    .from('handshakes')
    .select('id, borrower_id, amount, payment_id')
    .eq('payment_id', paymentId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  let handshakeId = handshake?.id as string | undefined;

  if (!handshakeId) {
    const { data: byMandate } = await admin
      .from('handshakes')
      .select('id')
      .eq('gocardless_mandate_id', paymentId)
      .maybeSingle();
    handshakeId = byMandate?.id as string | undefined;
  }

  if (!handshakeId) {
  // eslint-disable-next-line no-console
    console.warn('[gocardless/webhook] payment_success with no matching handshake', { paymentId });
    return { handshakeId: null };
  }

  await admin.from('handshakes').update({ payment_id: paymentId }).eq('id', handshakeId);

  // eslint-disable-next-line no-console
  console.info('[gocardless/webhook:escrow]', {
    paymentId,
    handshakeId,
    policy:
      'Payout to borrower bank ONLY after Client Money Account clears funds and AML checks pass.',
  });

  const web3 = await executeWeb3Transaction(handshakeId, 'UPDATE_EMI_PAID', { payment_id: paymentId });

  if (web3.queued) {
  // eslint-disable-next-line no-console
    console.warn('[gocardless/webhook] Polygon unavailable — EMI update queued', {
      handshakeId,
      paymentId,
      error: web3.error,
    });
  }

  return { handshakeId };
}

async function handlePaymentFailure(event: {
  links?: Record<string, string>;
  details?: Record<string, unknown>;
}): Promise<void> {
  const paymentId = event.links?.payment ?? (event.details?.payment_id as string | undefined);
  const subscriptionId = event.links?.subscription ?? (event.details?.subscription_id as string | undefined);
  const admin = createAdminClient();

  let query = admin
    .from('handshakes')
    .select('id, amount, emi_amount, payment_id, gocardless_subscription_id, guarantor_status, guarantor_mandate_id')
    .limit(1);

  if (paymentId) {
    query = query.eq('payment_id', paymentId);
  } else if (subscriptionId) {
    query = query.eq('gocardless_subscription_id', subscriptionId);
  }

  const { data: handshake } = await query.maybeSingle();
  if (!handshake) {
    // eslint-disable-next-line no-console
    console.warn('[gocardless/webhook] payment failure with no matching handshake', {
      paymentId,
      subscriptionId,
    });
    return;
  }

  const guarantorStatus = String(handshake.guarantor_status ?? 'none').toLowerCase();
  const mandateId = (handshake.guarantor_mandate_id as string | null) ?? null;
  const amountGbp = Number(handshake.emi_amount ?? handshake.amount ?? 0);

  const eventInsert = await admin
    .from('guarantor_payment_events')
    .insert({
    handshake_id: handshake.id,
    original_payment_id: paymentId ?? subscriptionId ?? null,
    amount_gbp: amountGbp,
    status: 'pending',
    trigger_reason: 'Guarantor Triggered Payment',
    metadata: {
      original_payment_id: paymentId ?? null,
      subscription_id: subscriptionId ?? null,
      original_event_status: 'failed',
    },
    })
    .select('id')
    .single();

  if (eventInsert.error) {
    throw new Error(eventInsert.error.message);
  }

  if (guarantorStatus !== 'accepted' || !mandateId) {
    await admin
      .from('guarantor_payment_events')
      .update({
        status: 'skipped',
        metadata: {
          original_payment_id: paymentId ?? null,
          subscription_id: subscriptionId ?? null,
          reason: 'No accepted guarantor mandate',
        },
      })
      .eq('id', eventInsert.data.id);
    return;
  }

  const fallback = await createGuarantorFallbackPayment({
    handshakeId: handshake.id as string,
    originalPaymentId: paymentId ?? subscriptionId ?? undefined,
    mandateId,
    amountGbp,
  });

  await admin
    .from('guarantor_payment_events')
    .update({
      status: fallback.success ? 'triggered' : 'failed',
      guarantor_payment_id: fallback.paymentId ?? null,
      metadata: {
        original_payment_id: paymentId ?? null,
        subscription_id: subscriptionId ?? null,
        original_event_status: 'failed',
        stub: Boolean(fallback.stub),
        error: fallback.error ?? null,
      },
    })
    .eq('id', eventInsert.data.id);

  if (fallback.success) {
    // eslint-disable-next-line no-console
    console.info('[gocardless/webhook] Guarantor fallback payment triggered', {
      handshakeId: handshake.id,
      originalPaymentId: paymentId,
      guarantorPaymentId: fallback.paymentId,
      stub: Boolean(fallback.stub),
    });
  } else {
    // eslint-disable-next-line no-console
    console.warn('[gocardless/webhook] Guarantor fallback payment failed', {
      handshakeId: handshake.id,
      originalPaymentId: paymentId,
      error: fallback.error,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GoCardlessWebhookBody;
    const events = body.events ?? [];

    for (const event of events) {
      if (event.resource_type === 'payments' && event.action === 'confirmed') {
        const paymentId = event.links?.payment;
        if (paymentId) await handlePaymentSuccess(paymentId);
      }

      if (event.action === 'payment_success') {
        const paymentId = event.links?.payment ?? (event.details?.payment_id as string | undefined);
        if (paymentId) await handlePaymentSuccess(paymentId);
      }

      if (event.resource_type === 'payments' && isFailedPaymentAction(event.action)) {
        await handlePaymentFailure(event);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Webhook processing failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
