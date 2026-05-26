import { NextResponse } from 'next/server';
import gocardless from 'gocardless-nodejs';
import { Environments } from 'gocardless-nodejs/constants';

// Initialize Client
const client = gocardless(
  process.env.GOCARDLESS_ACCESS_TOKEN!,
  process.env.GOCARDLESS_ENVIRONMENT === 'live'
    ? Environments.Live
    : Environments.Sandbox
);

export async function POST(req: Request) {
  try {
    const { borrowerId, lenderId, handshakeId } = await req.json();

    void borrowerId;
    void lenderId;

    // Step 1: Create Billing Request
    const billingRequest = await client.billingRequests.create({
      mandate_request: {
        currency: 'GBP',
      },
    });

    // Step 2: Create Billing Request Flow
    const flow = await client.billingRequestFlows.create({
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/payments/mandate-complete?handshakeId=${handshakeId}`,
      links: {
        billing_request: billingRequest.id,
      },
    });

    return NextResponse.json({ authorisation_url: flow.authorisation_url });
  } catch (error: unknown) {
    console.error('GoCardless SDK Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create mandate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
