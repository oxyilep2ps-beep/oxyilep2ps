import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type SetupMandateBody = {
  borrowerId?: string;
  lenderId?: string;
  handshakeId?: string;
};

type GoCardlessBillingRequestResponse = {
  billing_requests?: {
    id?: string;
  };
};

type GoCardlessBillingRequestFlowResponse = {
  billing_request_flows?: {
    id?: string;
    authorisation_url?: string;
  };
};

const GOCARDLESS_HEADERS = {
  Authorization: `Bearer ${process.env.GOCARDLESS_ACCESS_TOKEN}`,
  'GoCardless-Version': '2015-04-29',
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

async function parseGoCardlessError(response: Response, step: string) {
  const errorJson = await response.json();
  console.error(`[GoCardless] ${step} failed`, errorJson);
  throw new Error(`GoCardless ${step} failed with status ${response.status}`);
}

async function createBillingRequest(): Promise<GoCardlessBillingRequestResponse> {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN;

  if (!token) {
    throw new Error('GOCARDLESS_ACCESS_TOKEN is not configured');
  }

  const response = await fetch('https://api-sandbox.gocardless.com/billing_requests', {
    method: 'POST',
    headers: GOCARDLESS_HEADERS,
    body: JSON.stringify({
      billing_requests: {
        mandate_request: {
          currency: 'GBP',
        },
      },
    }),
  });

  if (!response.ok) {
    await parseGoCardlessError(response, 'create billing request');
  }

  return response.json() as Promise<GoCardlessBillingRequestResponse>;
}

async function createBillingRequestFlow(billingRequestId: string): Promise<GoCardlessBillingRequestFlowResponse> {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/payments/mandate-complete`;

  const response = await fetch('https://api-sandbox.gocardless.com/billing_request_flows', {
    method: 'POST',
    headers: GOCARDLESS_HEADERS,
    body: JSON.stringify({
      billing_request_flows: {
        redirect_uri: redirectUri,
        links: {
          billing_request: billingRequestId,
        },
      },
    }),
  });

  if (!response.ok) {
    await parseGoCardlessError(response, 'create billing request flow');
  }

  return response.json() as Promise<GoCardlessBillingRequestFlowResponse>;
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

    const body = (await request.json()) as SetupMandateBody;

    const borrowerId = body.borrowerId;
    const lenderId = body.lenderId;
    const handshakeId = body.handshakeId;

    if (!borrowerId || !lenderId || !handshakeId) {
      return NextResponse.json(
        { ok: false, error: 'borrowerId, lenderId, and handshakeId are required' },
        { status: 400 }
      );
    }

    if (borrowerId !== user.id) {
      return NextResponse.json({ ok: false, error: 'Only the borrower can start mandate setup' }, { status: 403 });
    }

    const billingRequest = await createBillingRequest();
    const billingRequestId = billingRequest.billing_requests?.id;

    if (!billingRequestId) {
      console.error('[GoCardless] Missing billing request id', { billingRequest });
      return NextResponse.json({ ok: false, error: 'Missing Billing Request id' }, { status: 502 });
    }

    const flow = await createBillingRequestFlow(billingRequestId);
    const authorisationUrl = flow.billing_request_flows?.authorisation_url;

    if (!authorisationUrl) {
      console.error('[GoCardless] Missing authorisation_url', { flow });
      return NextResponse.json({ ok: false, error: 'Missing GoCardless authorisation URL' }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      authorisation_url: authorisationUrl,
      billing_request_id: billingRequestId,
      billing_request_flow_id: flow.billing_request_flows?.id ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Mandate setup failed';
    console.error('[GoCardless] setup-mandate failed', e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
