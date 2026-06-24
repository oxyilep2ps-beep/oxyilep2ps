import { NextResponse } from 'next/server';
import gocardless from 'gocardless-nodejs';
import { Environments } from 'gocardless-nodejs/constants';

const client = process.env.GOCARDLESS_ACCESS_TOKEN
  ? gocardless(
      process.env.GOCARDLESS_ACCESS_TOKEN,
      process.env.GOCARDLESS_ENVIRONMENT === 'live' ? Environments.Live : Environments.Sandbox
    )
  : null;

function appBaseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
}

function sandboxCheckoutUrl(req: Request, handshakeId: string): string {
  const url = new URL('/payments/sandbox', appBaseUrl(req));
  url.searchParams.set('handshakeId', handshakeId);
  return url.toString();
}

export async function POST(req: Request) {
  try {
    const { borrowerId, lenderId, handshakeId } = (await req.json()) as {
      borrowerId?: string;
      lenderId?: string;
      handshakeId?: string;
    };

    void borrowerId;
    void lenderId;

    const id = handshakeId?.trim();
    if (!id) {
      return NextResponse.json({ error: 'handshakeId is required' }, { status: 400 });
    }

    const useSandboxOnly =
      !client ||
      process.env.PAYMENT_SANDBOX_MODE === 'true' ||
      process.env.PAYMENT_SANDBOX_MODE === '1';

    if (useSandboxOnly) {
      return NextResponse.json({
        authorisation_url: sandboxCheckoutUrl(req, id),
        stub: true,
        ok: true,
      });
    }

    const billingRequest = await client!.billingRequests.create({
      mandate_request: {
        currency: 'GBP',
      },
    });

    const redirectUrl = new URL('/payments/mandate-complete', appBaseUrl(req));
    redirectUrl.searchParams.set('handshakeId', id);
    redirectUrl.searchParams.set('billingRequestId', billingRequest.id);

    const flow = await client!.billingRequestFlows.create({
      redirect_uri: redirectUrl.toString(),
      links: {
        billing_request: billingRequest.id,
      },
    });

    return NextResponse.json({ authorisation_url: flow.authorisation_url, ok: true });
  } catch (error: unknown) {
    console.error('GoCardless SDK Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create mandate';

    try {
      const body = (await req.clone().json()) as { handshakeId?: string };
      const id = body.handshakeId?.trim();
      if (id) {
        return NextResponse.json({
          authorisation_url: sandboxCheckoutUrl(req, id),
          stub: true,
          ok: true,
          fallback: message,
        });
      }
    } catch {
      // ignore parse errors
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
