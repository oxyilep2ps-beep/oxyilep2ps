/**
 * GoCardless subscription (recurring EMI) creation.
 */

import { toGoCardlessAmountPence } from '@/lib/gocardless/amount';

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

export type CreateSubscriptionResult = {
  success: boolean;
  subscription_id?: string;
  stub?: boolean;
  error?: string;
};

export async function createMonthlyEmiSubscription(params: {
  mandateId: string;
  /** EMI in GBP major units (e.g. 10.50) — converted to pence at API submission. */
  amountGbp: number;
  name: string;
  handshakeId: string;
  intervalMonths?: number;
  totalPayments?: number;
}): Promise<CreateSubscriptionResult> {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN;

  if (!token) {
    return {
      success: true,
      stub: true,
      subscription_id: `SB_${params.handshakeId.slice(0, 8)}_${Date.now()}`,
    };
  }

  const amountPence = toGoCardlessAmountPence(params.amountGbp);
  if (amountPence < 100) {
    return {
      success: false,
      error: `EMI amount must be at least £1.00 for GoCardless (got £${params.amountGbp}).`,
    };
  }

  try {
    const payload: Record<string, unknown> = {
      subscriptions: {
        amount: amountPence,
        currency: 'GBP',
        name: params.name,
        interval_unit: 'monthly',
        interval: params.intervalMonths ?? 1,
        links: { mandate: params.mandateId },
        metadata: {
          handshake_id: params.handshakeId,
          platform: 'oxyile',
        },
      },
    };

    if (params.totalPayments && params.totalPayments > 0) {
      (payload.subscriptions as Record<string, unknown>).count = String(params.totalPayments);
    }

    const result = await gcFetch<{ subscriptions: { id: string } }>('/subscriptions', payload);

    return {
      success: true,
      subscription_id: result.subscriptions.id,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Subscription creation failed',
    };
  }
}
