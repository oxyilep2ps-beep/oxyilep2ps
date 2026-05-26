import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GOCARDLESS_BASE_URL = 'https://api-sandbox.gocardless.com';
const GOCARDLESS_VERSION = '2015-04-29';

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

async function postToGoCardless<T>(path: string, payload: unknown): Promise<T> {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN;

  if (!token) {
    throw new Error('GOCARDLESS_ACCESS_TOKEN is not configured');
  }

  const response = await fetch(`${GOCARDLESS_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'GoCardless-Version': GOCARDLESS_VERSION,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json: unknown = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    console.error('[GoCardless] API error', {
      path,
      status: response.status,
      response: json,
    });
    throw new Error(`GoCardless API error ${response.status}`);
  }

  return json as T;
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const redirectUri = `${appUrl.replace(/\/$/, '')}/payments/mandate-complete`;

    const billingRequest = await postToGoCardless<GoCardlessBillingRequestResponse>('/billing_requests', {
      billing_requests: {
        mandate_request: {
          currency: 'GBP',
        },
        metadata: {
          borrower_id: borrowerId,
          lender_id: lenderId,
          handshake_id: handshakeId,
          platform: 'oxyile',
        },
      },
    });

    const billingRequestId = billingRequest.billing_requests?.id;

    if (!billingRequestId) {
      console.error('[GoCardless] Missing billing request id', { billingRequest });
      return NextResponse.json({ ok: false, error: 'Missing Billing Request id' }, { status: 502 });
    }

    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('status', 'success');
    callbackUrl.searchParams.set('handshakeId', handshakeId);

    const exitUrl = new URL(redirectUri);
    exitUrl.searchParams.set('status', 'cancelled');
    exitUrl.searchParams.set('handshakeId', handshakeId);

    const flow = await postToGoCardless<GoCardlessBillingRequestFlowResponse>('/billing_request_flows', {
      billing_request_flows: {
        redirect_uri: callbackUrl.toString(),
        exit_uri: exitUrl.toString(),
        links: {
          billing_request: billingRequestId,
        },
      },
    });

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
