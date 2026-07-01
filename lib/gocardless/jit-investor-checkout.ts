/**
 * GoCardless Billing Request + Flow for investor JIT escrow funding (one-off payment).
 */

export type JITInvestorCheckoutResult = {
  success: boolean;
  checkout_url?: string;
  billing_request_id?: string;
  billing_request_flow_id?: string;
  stub?: boolean;
  error?: string;
};

function getGoCardlessBaseUrl(): string {
  const env = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox';
  return env === 'live' ? 'https://api.gocardless.com' : 'https://api-sandbox.gocardless.com';
}

async function gcFetch<T>(path: string, body: unknown): Promise<T> {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN;
  if (!token) throw new Error('GOCARDLESS_ACCESS_TOKEN is not configured');

  const res = await fetch(`${getGoCardlessBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'GoCardless-Version': '2015-07-06',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GoCardless ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function createInvestorJITCheckout(params: {
  handshakeId: string;
  lenderId: string;
  borrowerId: string;
  /** Amount in pence (minor units) — must already be Math.round(gbp * 100). */
  amountPence: number;
  successRedirectUrl: string;
  exitRedirectUrl?: string;
}): Promise<JITInvestorCheckoutResult> {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN;

  if (!token) {
    const stubUrl = new URL(params.successRedirectUrl);
    stubUrl.searchParams.set('stub', '1');
    stubUrl.searchParams.set('handshake_id', params.handshakeId);
    return {
      success: true,
      stub: true,
      checkout_url: stubUrl.toString(),
      billing_request_id: `BRQ_JIT_STUB_${Date.now()}`,
      billing_request_flow_id: `BRF_JIT_STUB_${Date.now()}`,
    };
  }

  try {
    const billingRequest = await gcFetch<{ billing_requests: { id: string } }>('/billing_requests', {
      billing_requests: {
        payment_request: {
          amount: params.amountPence,
          currency: 'GBP',
          description: `Oxyile JIT Escrow — ${params.handshakeId.slice(0, 8)}`,
        },
        metadata: {
          handshake_id: params.handshakeId,
          lender_id: params.lenderId,
          borrower_id: params.borrowerId,
          flow: 'jit_investor_funding',
          platform: 'oxyile',
        },
      },
    });

    const billingRequestId = billingRequest.billing_requests.id;

    const redirectUrl = new URL(params.successRedirectUrl);
    redirectUrl.searchParams.set('billing_request_id', billingRequestId);

    const flow = await gcFetch<{
      billing_request_flows: { id: string; authorisation_url: string };
    }>('/billing_request_flows', {
      billing_request_flows: {
        redirect_uri: redirectUrl.toString(),
        exit_uri: params.exitRedirectUrl ?? redirectUrl.toString(),
        links: {
          billing_request: billingRequestId,
        },
      },
    });

    return {
      success: true,
      checkout_url: flow.billing_request_flows.authorisation_url,
      billing_request_id: billingRequestId,
      billing_request_flow_id: flow.billing_request_flows.id,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Investor checkout creation failed',
    };
  }
}
