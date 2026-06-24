/**
 * GoCardless Billing Request Flow — returns authorisation_url for borrower mandate setup.
 * @see https://developer.gocardless.com/api-reference/#billing-requests-create-a-billing-request
 */

export type SetupMandateFlowResult = {
  success: boolean;
  authorisation_url?: string;
  billing_request_id?: string;
  billing_request_flow_id?: string;
  error?: string;
  stub?: boolean;
};

function getGoCardlessBaseUrl(): string {
  const env = process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox';
  return env === 'live' ? 'https://api.gocardless.com' : 'https://api-sandbox.gocardless.com';
}

async function gcFetch<T>(path: string, body: unknown): Promise<T> {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN;
  if (!token) {
    throw new Error('GOCARDLESS_ACCESS_TOKEN is not configured');
  }

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

/**
 * Creates a BACS billing request + hosted flow for the borrower to authorise Direct Debit.
 */
export async function createBillingRequestMandateFlow(params: {
  borrowerId: string;
  lenderId: string;
  handshakeId: string;
  redirectUri: string;
  exitUri?: string;
}): Promise<SetupMandateFlowResult> {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN;
  const redirectWithHandshake = new URL(params.redirectUri);
  redirectWithHandshake.searchParams.set('handshakeId', params.handshakeId);

  if (!token) {
    const sandbox = new URL('/payments/sandbox', redirectWithHandshake.origin);
    sandbox.searchParams.set('handshakeId', params.handshakeId);
    return {
      success: true,
      stub: true,
      authorisation_url: sandbox.toString(),
      billing_request_id: `BRQ_STUB_${Date.now()}`,
      billing_request_flow_id: `BRF_STUB_${Date.now()}`,
    };
  }

  try {
    const billingRequest = await gcFetch<{ billing_requests: { id: string } }>('/billing_requests', {
      billing_requests: {
        mandate_request: {
          scheme: 'bacs',
          metadata: {
            borrower_id: params.borrowerId,
            lender_id: params.lenderId,
            platform: 'oxyile',
          },
        },
      },
    });

    const billingRequestId = billingRequest.billing_requests.id;

    const flow = await gcFetch<{
      billing_request_flows: { id: string; authorisation_url: string };
    }>('/billing_request_flows', {
      billing_request_flows: {
        redirect_uri: redirectWithHandshake.toString(),
        exit_uri: params.exitUri ?? redirectWithHandshake.toString(),
        links: {
          billing_request: billingRequestId,
        },
      },
    });

    return {
      success: true,
      authorisation_url: flow.billing_request_flows.authorisation_url,
      billing_request_id: billingRequestId,
      billing_request_flow_id: flow.billing_request_flows.id,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Billing request flow failed',
    };
  }
}
