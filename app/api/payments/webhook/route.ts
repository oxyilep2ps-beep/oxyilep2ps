import { NextResponse } from 'next/server';
import gocardless, { Environments } from 'gocardless-nodejs';
import * as webhooks from 'gocardless-nodejs';
import { createAdminClient } from '@/lib/supabase/admin';

type GoCardlessWebhookEvent = {
  action?: string;
  id?: string;
  links?: Record<string, string>;
  resource_type?: string;
  [key: string]: unknown;
};

const goCardlessClient = gocardless(
  process.env.GOCARDLESS_ACCESS_TOKEN ?? 'test-token',
  process.env.GOCARDLESS_ENVIRONMENT === 'live' ? Environments.Live : Environments.Sandbox
);

async function handleMandateEvent(event: GoCardlessWebhookEvent) {
  const mandateId = event.links?.mandate;
  if (!mandateId) return;

  const admin = createAdminClient();
  const status =
    event.action === 'active' || event.action === 'created'
      ? 'active'
      : event.action === 'cancelled'
        ? 'cancelled'
        : 'pending';

  await admin
    .from('gocardless_mandates')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('mandate_id', mandateId);
}

async function handleSubscriptionEvent(event: GoCardlessWebhookEvent) {
  const subscriptionId = event.links?.subscription;
  if (!subscriptionId) return;

  const admin = createAdminClient();
  const verified = event.action === 'created' || event.action === 'active';

  await admin
    .from('handshakes')
    .update({
      payment_status: verified ? 'ACTIVE' : 'PENDING',
      auto_emi_active: verified,
    })
    .eq('gocardless_subscription_id', subscriptionId);
}

async function handleWebhookEvent(event: GoCardlessWebhookEvent) {
  switch (event.resource_type) {
    case 'mandates':
      await handleMandateEvent(event);
      break;
    case 'subscriptions':
      await handleSubscriptionEvent(event);
      break;
    case 'payments':
      break;
    default:
      break;
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.GOCARDLESS_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { ok: false, error: 'GOCARDLESS_WEBHOOK_SECRET is not configured' },
      { status: 500 }
    );
  }

  const signatureHeader = request.headers.get('Webhook-Signature');
  if (!signatureHeader) {
    return NextResponse.json({ ok: false, error: 'Missing Webhook-Signature header' }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    const events = webhooks.parse(rawBody, webhookSecret, signatureHeader) as GoCardlessWebhookEvent[];
    for (const event of events) {
      await handleWebhookEvent(event);
    }
    void goCardlessClient;
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.name === 'InvalidSignatureError') {
      return NextResponse.json({ ok: false, error: 'Invalid webhook signature' }, { status: 400 });
    }
    console.error('GoCardless webhook processing failed:', error);
    return NextResponse.json({ ok: false, error: 'Webhook processing failed' }, { status: 500 });
  }
}
