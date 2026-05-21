import { NextResponse } from 'next/server';
import gocardless, { Environments } from 'gocardless-nodejs';
import * as webhooks from 'gocardless-nodejs';

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

function handleWebhookEvent(event: GoCardlessWebhookEvent) {
  switch (event.resource_type) {
    case 'mandates':
      switch (event.action) {
        case 'created':
        case 'active':
        case 'cancelled':
          // TODO: Use the Supabase Service Role key here to update mandate state,
          // persist the latest webhook payload, and link it back to the borrower/lender.
          break;
        default:
          break;
      }
      break;

    case 'payments':
      switch (event.action) {
        case 'created':
        case 'failed':
        case 'cancelled':
          // TODO: Use the Supabase Service Role key here to update payment state,
          // persist failure metadata, and reconcile the payment against Supabase records.
          break;
        default:
          break;
      }
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
      handleWebhookEvent(event);
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
