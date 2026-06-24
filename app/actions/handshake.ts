'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { HANDSHAKE_CONTRACT_ABI, PLACEHOLDER_HANDSHAKE_CONTRACT_AMOY } from '@/lib/web3/handshake-contract';
import { createPolygonRelayerWallet } from '@/lib/web3/relayer-wallet';

export type ExecuteHandshakeResult = {
  ok: boolean;
  polygonTxHash: string | null;
  sandbox: false;
  warning?: string | null;
};

function isPolygonTxHash(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Mint handshake on Polygon Amoy and persist tx hash on `handshakes` row.
 * Requires POLYGON_PRIVATE_KEY and optional POLYGON RPC/contract env vars.
 */
export async function executeHandshake(
  lenderId: string,
  borrowerId: string,
  handshakeId: string
): Promise<ExecuteHandshakeResult> {
  const admin = createAdminClient();

  const { data: handshake, error: fetchError } = await admin
    .from('handshakes')
    .select('*')
    .eq('id', handshakeId)
    .eq('lender_id', lenderId)
    .eq('borrower_id', borrowerId)
    .maybeSingle();

  if (fetchError || !handshake) {
    throw new Error(fetchError?.message || 'Handshake not found');
  }

  if (!handshake.lender_approved_at || !handshake.borrower_approved_at) {
    throw new Error('Both parties must approve before on-chain execution');
  }

  const wallet = createPolygonRelayerWallet();
  const contractAddress = process.env.POLYGON_HANDSHAKE_CONTRACT;
  const { ethers } = await import('ethers');

  let polygonTxHash: string | null = null;
  let warning: string | null = null;

  try {
    if (contractAddress && contractAddress !== PLACEHOLDER_HANDSHAKE_CONTRACT_AMOY) {
      const contract = new ethers.Contract(contractAddress, HANDSHAKE_CONTRACT_ABI, wallet);
      const tx = await contract.mintAgreement(
        handshake.id,
        lenderId,
        borrowerId,
        ethers.parseUnits(String(handshake.amount), 2),
        BigInt(Math.round(Number(handshake.rate) * 100)),
        BigInt(handshake.duration)
      );
      const receipt = await tx.wait();
      const receiptHash = receipt?.hash ?? tx.hash ?? null;
      if (!isPolygonTxHash(receiptHash)) {
        throw new Error('Polygon receipt hash missing or invalid for handshake mint transaction');
      }
      polygonTxHash = receiptHash;
    } else {
      // Fallback when no deployed contract address is configured:
      // send a 0-value on-chain log transaction with handshake metadata payload.
      const tx = await wallet.sendTransaction({
        to: wallet.address,
        value: 0n,
        data: ethers.hexlify(ethers.toUtf8Bytes(`OXYILE-CONTRACT-${handshakeId}`)),
      });
      const receipt = await tx.wait();
      const receiptHash = receipt?.hash ?? tx.hash ?? null;
      if (!isPolygonTxHash(receiptHash)) {
        throw new Error('Polygon receipt hash missing or invalid for fallback on-chain log transaction');
      }
      polygonTxHash = receiptHash;
      warning = 'No POLYGON_HANDSHAKE_CONTRACT configured. Logged handshake proof via self-transaction.';
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Polygon mint failed';
    throw new Error(`Polygon transaction failed: ${message}`);
  }

  const { error: updateError } = await admin
    .from('handshakes')
    .update({
      status: 'ACTIVE',
      payment_status: 'PENDING',
      polygon_tx_hash: polygonTxHash,
      activated_at: new Date().toISOString(),
    })
    .eq('id', handshakeId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { ok: true, polygonTxHash, sandbox: false, warning };
}

/** Legacy `agreements` table execution (portfolio / older chat flows). */
export async function executeLegacyAgreement(agreementId: string): Promise<ExecuteHandshakeResult> {
  const admin = createAdminClient();

  const { data: agreement, error: fetchError } = await admin
    .from('agreements')
    .select('*')
    .eq('id', agreementId)
    .maybeSingle();

  if (fetchError || !agreement) {
    throw new Error(fetchError?.message || 'Agreement not found');
  }

  const wallet = createPolygonRelayerWallet();
  const contractAddress = process.env.POLYGON_HANDSHAKE_CONTRACT;
  const { ethers } = await import('ethers');

  let polygonTxHash: string | null = null;
  let warning: string | null = null;

  try {
    if (contractAddress && contractAddress !== PLACEHOLDER_HANDSHAKE_CONTRACT_AMOY) {
      const contract = new ethers.Contract(contractAddress, HANDSHAKE_CONTRACT_ABI, wallet);
      const tx = await contract.mintAgreement(
        agreement.id,
        agreement.lender_id,
        agreement.borrower_id,
        ethers.parseUnits(String(agreement.amount), 2),
        BigInt(Math.round(Number(agreement.interest_rate) * 100)),
        BigInt(agreement.duration_months)
      );
      const receipt = await tx.wait();
      const receiptHash = receipt?.hash ?? tx.hash ?? null;
      if (!isPolygonTxHash(receiptHash)) {
        throw new Error('Polygon receipt hash missing or invalid for legacy agreement mint transaction');
      }
      polygonTxHash = receiptHash;
    } else {
      const tx = await wallet.sendTransaction({
        to: wallet.address,
        value: 0n,
        data: ethers.hexlify(ethers.toUtf8Bytes(`OXYILE-AGREEMENT-${agreement.id}`)),
      });
      const receipt = await tx.wait();
      const receiptHash = receipt?.hash ?? tx.hash ?? null;
      if (!isPolygonTxHash(receiptHash)) {
        throw new Error('Polygon receipt hash missing or invalid for legacy fallback transaction');
      }
      polygonTxHash = receiptHash;
      warning = 'No POLYGON_HANDSHAKE_CONTRACT configured. Logged legacy agreement proof via self-transaction.';
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Polygon mint failed';
    throw new Error(`Polygon transaction failed: ${message}`);
  }

  const { error: updateError } = await admin
    .from('agreements')
    .update({
      status: 'ACTIVE',
      polygon_tx_hash: polygonTxHash,
      activated_at: new Date().toISOString(),
    })
    .eq('id', agreement.id);

  if (updateError) throw new Error(updateError.message);

  return { ok: true, polygonTxHash, sandbox: false, warning };
}
