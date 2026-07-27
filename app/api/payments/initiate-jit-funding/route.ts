import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createInvestorJITCheckout } from '@/lib/gocardless/jit-investor-checkout';

function getAppBaseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(req.url).origin;
}

/**
 * Investor JIT funding — creates GoCardless hosted checkout for escrow deposit.
 * Requires an authenticated investor session (cookie-based).
 */
export async function POST(req: Request) {
  try {
    if (!process.env.GOCARDLESS_ACCESS_TOKEN) {
      console.error('🚨 CRITICAL: Missing Payment API Key in Environment Variables (GOCARDLESS_ACCESS_TOKEN)');
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('🚨 FUNDING AUTH ERROR (getUser):', authError.message, authError);
    }

    if (!user) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.error('🚨 NO SUPABASE SESSION FOUND IN API ROUTE', {
        hasSession: Boolean(session),
        authError: authError?.message ?? null,
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in again.' },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      handshakeId?: string;
      amount?: number;
    };

    const id = body.handshakeId?.trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'handshakeId is required' }, { status: 400 });
    }

    const amount = Number(body.amount);
    const amountPence = Math.round(amount * 100);
    if (!Number.isFinite(amountPence) || amountPence < 100) {
      return NextResponse.json(
        { success: false, error: 'Funding amount must be at least £1.00 for GoCardless.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: handshake, error: hsError } = await admin
      .from('handshakes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (hsError || !handshake) {
      console.error('🚨 FUNDING HANDSHAKE LOOKUP:', hsError?.message ?? 'not found', id);
      return NextResponse.json({ success: false, error: 'Handshake not found' }, { status: 404 });
    }

    if (handshake.lender_id !== user.id) {
      console.error('🚨 FUNDING UNAUTHORIZED CRASH: lender mismatch', {
        userId: user.id,
        lenderId: handshake.lender_id,
        handshakeId: id,
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only the investor can fund this escrow.' },
        { status: 401 }
      );
    }

    if (handshake.funded_at || handshake.status === 'FUNDED' || handshake.status === 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'This handshake has already been funded' },
        { status: 409 }
      );
    }

    const guarantorStatus = String(handshake.guarantor_status ?? 'none').toLowerCase();
    if (guarantorStatus !== 'accepted') {
      return NextResponse.json(
        {
          success: false,
          error: 'Guarantor must accept terms and link their bank before escrow can be funded.',
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    if (!handshake.lender_approved_at) {
      const { error: approveError } = await admin
        .from('handshakes')
        .update({ lender_approved_at: now })
        .eq('id', id);

      if (approveError) {
        console.error('🚨 FUNDING APPROVE UPDATE:', approveError.message, approveError.details);
        return NextResponse.json({ success: false, error: approveError.message }, { status: 500 });
      }
    }

    const successUrl = new URL('/handshake/success', getAppBaseUrl(req));
    successUrl.searchParams.set('handshake_id', id);

    const checkout = await createInvestorJITCheckout({
      handshakeId: id,
      lenderId: handshake.lender_id as string,
      borrowerId: handshake.borrower_id as string,
      amountPence,
      successRedirectUrl: successUrl.toString(),
      exitRedirectUrl: new URL('/chats', getAppBaseUrl(req)).toString(),
    });

    if (!checkout.success || !checkout.checkout_url) {
      console.error('🚨 FUNDING GOCARDLESS CHECKOUT FAILED:', checkout.error);
      return NextResponse.json(
        { success: false, error: checkout.error ?? 'Could not create payment link' },
        { status: 502 }
      );
    }

    console.info('[initiate-jit-funding] ok', {
      handshakeId: id,
      userId: user.id,
      stub: checkout.stub ?? false,
    });

    return NextResponse.json({
      success: true,
      checkout_url: checkout.checkout_url,
      stub: checkout.stub ?? false,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number; details?: string; hint?: string };
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
