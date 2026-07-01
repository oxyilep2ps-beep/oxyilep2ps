'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateHandshakeFigures } from '@/lib/handshake/calculations';
import { createInvestorJITCheckout } from '@/lib/gocardless/jit-investor-checkout';
import { createMonthlyEmiSubscription } from '@/lib/gocardless/subscriptions';
import { anchorHandshakeOnPolygon } from '@/lib/web3/anchor-handshake-on-chain';

export type InitiateJITFundingResult =
  | { success: true; checkout_url: string; stub?: boolean }
  | { success: false; error: string };

export type ConfirmEscrowAndRouteResult =
  | { success: true; funded: true }
  | { success: false; error: string };

export type CompleteBorrowerBankLinkResult =
  | { success: true; txHash: string; agreementHash: string }
  | { success: false; error: string };

function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';
}

/**
 * Investor JIT funding — creates a GoCardless hosted checkout for escrow deposit.
 * Amount is converted to pence at submission (GoCardless minor units).
 */
export async function initiateJITFunding(
  handshakeId: string,
  amount: number
): Promise<InitiateJITFundingResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const id = handshakeId?.trim();
    if (!id) {
      return { success: false, error: 'handshakeId is required' };
    }

    const amountPence = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountPence) || amountPence < 100) {
      return {
        success: false,
        error: 'Funding amount must be at least £1.00 for GoCardless.',
      };
    }

    const admin = createAdminClient();
    const { data: handshake, error: hsError } = await admin
      .from('handshakes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (hsError || !handshake) {
      return { success: false, error: 'Handshake not found' };
    }

    if (handshake.lender_id !== user.id) {
      return { success: false, error: 'Only the investor can fund this escrow' };
    }

    if (handshake.funded_at || handshake.status === 'FUNDED' || handshake.status === 'ACTIVE') {
      return { success: false, error: 'This handshake has already been funded' };
    }

    const now = new Date().toISOString();
    if (!handshake.lender_approved_at) {
      const { error: approveError } = await admin
        .from('handshakes')
        .update({ lender_approved_at: now })
        .eq('id', id);

      if (approveError) {
        return { success: false, error: approveError.message };
      }
    }

    const successUrl = new URL('/handshake/success', getAppBaseUrl());
    successUrl.searchParams.set('handshake_id', id);

    const checkout = await createInvestorJITCheckout({
      handshakeId: id,
      lenderId: handshake.lender_id as string,
      borrowerId: handshake.borrower_id as string,
      amountPence,
      successRedirectUrl: successUrl.toString(),
      exitRedirectUrl: new URL('/chats', getAppBaseUrl()).toString(),
    });

    if (!checkout.success || !checkout.checkout_url) {
      return { success: false, error: checkout.error ?? 'Could not create payment link' };
    }

    return {
      success: true,
      checkout_url: checkout.checkout_url,
      stub: checkout.stub,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'JIT funding initiation failed',
    };
  }
}

/**
 * Step 1 complete — investor GoCardless return. Marks escrow as funded; borrower links bank next.
 */
export async function confirmEscrowAndRoute(
  handshakeId: string,
  billingRequestId?: string
): Promise<ConfirmEscrowAndRouteResult> {
  void billingRequestId;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const id = handshakeId?.trim();
    if (!id) {
      return { success: false, error: 'handshakeId is required' };
    }

    const admin = createAdminClient();
    const { data: handshake, error: hsError } = await admin
      .from('handshakes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (hsError || !handshake) {
      return { success: false, error: 'Handshake not found' };
    }

    if (handshake.lender_id !== user.id) {
      return { success: false, error: 'Only the funding investor can confirm this escrow' };
    }

    if (handshake.funded_at || handshake.status === 'FUNDED') {
      return { success: true, funded: true };
    }

    if (handshake.status === 'ACTIVE') {
      return { success: false, error: 'Handshake is already active' };
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
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath('/chats');
    revalidatePath('/handshake/success');

    return { success: true, funded: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Escrow confirmation failed',
    };
  }
}

/**
 * Step 2 — borrower mandate complete. Anchors Polygon ledger and activates handshake.
 */
export async function completeBorrowerBankLink(
  handshakeId: string,
  billingRequestId?: string
): Promise<CompleteBorrowerBankLinkResult> {
  void billingRequestId;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const id = handshakeId?.trim();
    if (!id) {
      return { success: false, error: 'handshakeId is required' };
    }

    const admin = createAdminClient();
    const { data: handshake, error: hsError } = await admin
      .from('handshakes')
      .select('*')
      .eq('id', id)
      .eq('borrower_id', user.id)
      .maybeSingle();

    if (hsError || !handshake) {
      return { success: false, error: 'Handshake not found' };
    }

    if (!handshake.funded_at && handshake.status !== 'FUNDED') {
      return { success: false, error: 'Investor must fund escrow before linking your bank' };
    }

    const existingTx =
      (handshake.tx_hash as string | null) ?? (handshake.polygon_tx_hash as string | null);
    if (handshake.status === 'ACTIVE' && existingTx) {
      return { success: true, txHash: existingTx, agreementHash: existingTx };
    }

    const now = new Date().toISOString();
    const timestamp =
      (handshake.funded_at as string) ||
      (handshake.borrower_approved_at as string) ||
      now;

    const figures = calculateHandshakeFigures(
      Number(handshake.amount ?? 0),
      Number(handshake.rate ?? 0),
      Number(handshake.duration ?? 1)
    );

    const anchor = await anchorHandshakeOnPolygon({
      handshakeId: id,
      borrowerId: handshake.borrower_id as string,
      lenderId: handshake.lender_id as string,
      amount: Number(handshake.amount ?? 0),
      durationMonths: Math.max(1, Math.round(Number(handshake.duration ?? 12))),
      timestamp,
    });

    if (!anchor.success) {
      return { success: false, error: anchor.error };
    }

    const borrowerMandateId = `MD_JIT_${id.slice(0, 8)}_${Date.now()}`;
    const { error: mandateError } = await admin.from('gocardless_mandates').upsert({
      user_id: handshake.borrower_id as string,
      mandate_id: borrowerMandateId,
      status: 'active',
      handshake_id: id,
      updated_at: now,
    });

    if (mandateError) {
      return { success: false, error: mandateError.message };
    }

    const sub = await createMonthlyEmiSubscription({
      mandateId: borrowerMandateId,
      amountGbp: figures.emi_amount,
      name: `Oxyile EMI — ${id.slice(0, 8)}`,
      handshakeId: id,
      totalPayments: Math.max(1, Math.round(Number(handshake.duration ?? 12))),
    });

    const { error: updateError } = await admin
      .from('handshakes')
      .update({
        status: 'ACTIVE',
        payment_status: 'ACTIVE',
        borrower_approved_at: handshake.borrower_approved_at ?? now,
        activated_at: handshake.activated_at ?? now,
        tx_hash: anchor.txHash,
        polygon_tx_hash: anchor.txHash,
        emi_amount: figures.emi_amount,
        total_return: figures.total_return,
        gocardless_subscription_id: sub.subscription_id ?? null,
        auto_emi_active: Boolean(sub.success),
      })
      .eq('id', id);

    if (updateError) {
      return {
        success: false,
        error: `On-chain tx succeeded (${anchor.txHash}) but database sync failed: ${updateError.message}`,
      };
    }

    revalidatePath('/chats');
    revalidatePath('/handshake/success');

    return {
      success: true,
      txHash: anchor.txHash,
      agreementHash: anchor.agreementHash,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Bank link activation failed',
    };
  }
}
