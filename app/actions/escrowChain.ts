'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateHandshakeFigures } from '@/lib/handshake/calculations';
import { createMonthlyEmiSubscription } from '@/lib/gocardless/subscriptions';
import { getPolygonPrivateKeyOrError } from '@/lib/env/server-secrets';
import { buildHandshakeOnChainData, hashHandshakeAgreement } from '@/lib/web3/handshake-hash';
import { POLYGON_AMOY_RPC_URL } from '@/lib/web3/polygon-amoy';

export type FinalizeEscrowOnChainResult =
  | { success: true; txHash: string; agreementHash: string }
  | { success: false; error: string };

function isValidTxHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

function getPolygonRpcUrl(): string {
  return (
    process.env.POLYGON_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_POLYGON_RPC_URL?.trim() ||
    POLYGON_AMOY_RPC_URL
  );
}

/**
 * Web2.5 escrow finalization — runs ONLY on the server.
 * 1. Anchors hashed handshake agreement on Polygon Amoy (relayer wallet)
 * 2. Updates Supabase handshake status AFTER on-chain confirmation
 */
export async function finalizeEscrowOnChain(
  handshakeId: string
): Promise<FinalizeEscrowOnChainResult> {
  const keyResult = getPolygonPrivateKeyOrError();
  if (typeof keyResult !== 'string') {
    return { success: false, error: keyResult.error };
  }

  const privateKey = keyResult;

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

    if (!handshake.lender_approved_at || !handshake.borrower_approved_at) {
      return { success: false, error: 'Both parties must approve before escrow funding' };
    }

    const timestamp =
      (handshake.borrower_approved_at as string) ||
      (handshake.lender_approved_at as string) ||
      new Date().toISOString();

    const agreementHash = hashHandshakeAgreement({
      handshakeId: id,
      borrowerId: handshake.borrower_id as string,
      lenderId: handshake.lender_id as string,
      amount: Number(handshake.amount ?? 0),
      timestamp,
    });

    const txData = buildHandshakeOnChainData({
      handshakeId: id,
      borrowerId: handshake.borrower_id as string,
      lenderId: handshake.lender_id as string,
      amount: Number(handshake.amount ?? 0),
      timestamp,
    });

    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(getPolygonRpcUrl());
    const wallet = new ethers.Wallet(privateKey, provider);

    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0n,
      data: txData,
    });

    const receipt = await tx.wait();
    const txHash = receipt?.hash ?? tx.hash;

    if (!isValidTxHash(txHash)) {
      return { success: false, error: 'Polygon relayer returned an invalid transaction hash' };
    }

    const figures = calculateHandshakeFigures(
      Number(handshake.amount ?? 0),
      Number(handshake.rate ?? 0),
      Number(handshake.duration ?? 1)
    );

    const now = new Date().toISOString();
    const mandateId = `MD_GC_${id.slice(0, 8)}_${Date.now()}`;

    const { error: mandateError } = await admin.from('gocardless_mandates').upsert({
      user_id: user.id,
      mandate_id: mandateId,
      status: 'active',
      handshake_id: id,
      updated_at: now,
    });

    if (mandateError) {
      return { success: false, error: mandateError.message };
    }

    const sub = await createMonthlyEmiSubscription({
      mandateId,
      amountPence: Math.max(1, Math.round(figures.emi_amount * 100)),
      name: `Oxyile EMI — ${id.slice(0, 8)}`,
      handshakeId: id,
      totalPayments: Math.max(1, Math.round(Number(handshake.duration ?? 12))),
    });

    const { error: updateError } = await admin
      .from('handshakes')
      .update({
        status: 'ACTIVE',
        payment_status: 'ACTIVE',
        tx_hash: txHash,
        polygon_tx_hash: txHash,
        emi_amount: figures.emi_amount,
        total_return: figures.total_return,
        gocardless_subscription_id: sub.subscription_id ?? null,
        auto_emi_active: Boolean(sub.success),
        activated_at: handshake.activated_at ?? now,
      })
      .eq('id', id);

    if (updateError) {
      return {
        success: false,
        error: `On-chain tx succeeded (${txHash}) but database sync failed: ${updateError.message}`,
      };
    }

    revalidatePath('/chats');
    revalidatePath('/payments/sandbox');

    return { success: true, txHash, agreementHash };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not record handshake on-chain';
    return { success: false, error: message };
  }
}
