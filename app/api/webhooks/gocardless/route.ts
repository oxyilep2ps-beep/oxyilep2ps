import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { executeWeb3Transaction } from '@/lib/web3/execute-web3-transaction';

type GoCardlessWebhookBody = {
  events?: Array<{
    action?: string;
    resource_type?: string;
    links?: Record<string, string>;
    details?: Record<string, unknown>;
  }>;
};

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
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Webhook processing failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
