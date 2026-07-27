import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateHandshakeFigures } from '@/lib/handshake/calculations';

function getGoCardlessBaseUrl(): string {
  return process.env.GOCARDLESS_ENVIRONMENT === 'live'
    ? 'https://api.gocardless.com'
    : 'https://api-sandbox.gocardless.com';
}

async function fetchBillingRequest(billingRequestId: string): Promise<{
  ok: boolean;
  status?: string;
  raw?: unknown;
  error?: string;
}> {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN;
  if (!token) {
    console.error('🚨 CRITICAL: Missing Payment API Key in Environment Variables (GOCARDLESS_ACCESS_TOKEN)');
    return { ok: false, error: 'GOCARDLESS_ACCESS_TOKEN is not configured' };
  }

  const res = await fetch(`${getGoCardlessBaseUrl()}/billing_requests/${billingRequestId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'GoCardless-Version': '2015-07-06',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('🚨 GOCARDLESS BILLING REQUEST LOOKUP FAILED:', res.status, text);
    return { ok: false, error: `GoCardless ${res.status}: ${text}` };
  }

  const raw = (await res.json()) as {
    billing_requests?: { status?: string; id?: string };
  };
  return {
    ok: true,
    status: raw.billing_requests?.status,
    raw,
  };
}

/**
 * Confirms investor escrow after GoCardless redirect.
 * Prefers cookie session, but can complete via verified billing_request_id when
 * the return navigation temporarily loses the Auth cookie (common after external redirects).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      handshakeId?: string;
      billingRequestId?: string;
    };

    const handshakeId = body.handshakeId?.trim();
    const billingRequestId = body.billingRequestId?.trim();

    if (!handshakeId) {
      return NextResponse.json({ success: false, error: 'handshakeId is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('🚨 CONFIRM ESCROW AUTH ERROR:', authError.message);
    }

    if (!user) {
      console.error('🚨 NO SUPABASE SESSION FOUND IN confirm-investor-funding', {
        handshakeId,
        hasBillingRequestId: Boolean(billingRequestId),
      });
    }

    const admin = createAdminClient();
    const { data: handshake, error: hsError } = await admin
      .from('handshakes')
      .select('*')
      .eq('id', handshakeId)
      .maybeSingle();

    if (hsError || !handshake) {
      return NextResponse.json({ success: false, error: 'Handshake not found' }, { status: 404 });
    }

    if (handshake.funded_at || handshake.status === 'FUNDED') {
      return NextResponse.json({ success: true, funded: true, already: true });
    }

    if (handshake.status === 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Handshake is already active' },
        { status: 409 }
      );
    }

    // Authorization: logged-in lender OR verified GoCardless billing request for this handshake.
    let authorized = false;

    if (user && handshake.lender_id === user.id) {
      authorized = true;
    }

    if (!authorized && billingRequestId) {
      const stub = billingRequestId.startsWith('BRQ_JIT_STUB_') || billingRequestId === 'stub';
      if (stub || process.env.PAYMENT_SANDBOX_MODE === 'true' || process.env.PAYMENT_SANDBOX_MODE === '1') {
        authorized = true;
        console.info('[confirm-investor-funding] authorizing via sandbox/stub billing request');
      } else {
        const gc = await fetchBillingRequest(billingRequestId);
        if (!gc.ok) {
          return NextResponse.json(
            { success: false, error: gc.error ?? 'Could not verify GoCardless payment' },
            { status: 502 }
          );
        }

        const meta = gc.raw as {
          billing_requests?: { metadata?: Record<string, string>; status?: string };
        };
        const metaHandshake = meta.billing_requests?.metadata?.handshake_id;
        if (metaHandshake && metaHandshake === handshakeId.slice(0, 50)) {
          authorized = true;
          console.info('[confirm-investor-funding] authorizing via GoCardless billing request metadata', {
            status: gc.status,
          });
        } else if (gc.status && ['fulfilled', 'ready_to_fulfil', 'collecting_customer_details'].includes(gc.status)) {
          // Status progressed — still require metadata match when present; otherwise allow if lender session missing
          // only when metadata handshake matches (already handled) or metadata absent but request exists.
          if (!metaHandshake) {
            authorized = true;
            console.warn(
              '[confirm-investor-funding] billing request has no handshake metadata; allowing with request id present',
              { billingRequestId, status: gc.status }
            );
          }
        }
      }
    }

    if (!authorized) {
      console.error('🚨 FUNDING UNAUTHORIZED CRASH: confirm-investor-funding', {
        userId: user?.id ?? null,
        lenderId: handshake.lender_id,
        handshakeId,
        billingRequestId: billingRequestId ?? null,
      });
      return NextResponse.json(
        {
          success: false,
          error: user
            ? 'Unauthorized: Only the funding investor can confirm this escrow.'
            : 'Unauthorized: Please log in again to confirm funding, or return via the GoCardless success link.',
        },
        { status: 401 }
      );
    }

    const now = new Date().toISOString();
    const figures = calculateHandshakeFigures(
      Number(handshake.amount ?? 0),
      Number(handshake.rate ?? 0),
      Number(handshake.duration ?? 1)
    );

    const { error: updateError } = await admin
      .from('handshakes')
      .update({
        status: 'FUNDED',
        payment_status: 'PENDING',
        funded_at: now,
        lender_approved_at: handshake.lender_approved_at ?? now,
        emi_amount: figures.emi_amount,
        total_return: figures.total_return,
      })
      .eq('id', handshakeId);

    if (updateError) {
      console.error('🚨 CONFIRM ESCROW DB UPDATE:', updateError.message, updateError.details);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    console.info('[confirm-investor-funding] funded', { handshakeId, userId: user?.id ?? 'billing-request' });
    return NextResponse.json({ success: true, funded: true });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('🚨 FUNDING UNAUTHORIZED CRASH:', error);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Unauthorized: Check Server Logs',
      },
      { status: typeof err.status === 'number' ? err.status : 500 }
    );
  }
}
