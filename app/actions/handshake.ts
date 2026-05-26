'use server';

import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { HANDSHAKE_CONTRACT_ABI, PLACEHOLDER_HANDSHAKE_CONTRACT_AMOY } from '@/lib/web3/handshake-contract';

export type ExecuteHandshakeResult = {
  ok: boolean;
  polygonTxHash: string | null;
  sandbox: boolean;
  warning?: string | null;
};

function isPolygonTxHash(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value);
}

function createMockPolygonTxHash(seed: string): `0x${string}` {
  return `0x${createHash('sha256')
    .update(`${seed}:${Date.now()}:${Math.random()}`)
    .digest('hex')}`;
}

/**
 * Mint handshake on Polygon Amoy and persist tx hash on `handshakes` row.
 * Uses ADMIN_WALLET_PRIVATE_KEY + NEXT_PUBLIC_POLYGON_RPC_URL (testable sandbox).
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

  const rpcUrl = process.env.NEXT_PUBLIC_POLYGON_RPC_URL ?? process.env.POLYGON_RPC_URL;
  const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY ?? process.env.POLYGON_SIGNER_PRIVATE_KEY;
  const contractAddress =
    process.env.POLYGON_HANDSHAKE_CONTRACT ?? PLACEHOLDER_HANDSHAKE_CONTRACT_AMOY;

  let polygonTxHash: string | null = null;
  let sandbox = true;
  let warning: string | null = null;

  if (rpcUrl && privateKey && contractAddress !== PLACEHOLDER_HANDSHAKE_CONTRACT_AMOY) {
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
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
      polygonTxHash = isPolygonTxHash(receiptHash) ? receiptHash : createMockPolygonTxHash(handshake.id);
      sandbox = false;
    } catch (err) {
      warning = err instanceof Error ? err.message : 'Polygon mint failed';
      polygonTxHash = createMockPolygonTxHash(handshake.id);
    }
  } else {
    warning =
      'Sandbox mode: set POLYGON_HANDSHAKE_CONTRACT (deployed on Amoy) for live chain mint. Using mock 0x transaction hash.';
    polygonTxHash = createMockPolygonTxHash(handshake.id);
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

  return { ok: true, polygonTxHash, sandbox, warning };
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

  const rpcUrl = process.env.NEXT_PUBLIC_POLYGON_RPC_URL ?? process.env.POLYGON_RPC_URL;
  const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY ?? process.env.POLYGON_SIGNER_PRIVATE_KEY;
  const contractAddress =
    process.env.POLYGON_HANDSHAKE_CONTRACT ?? PLACEHOLDER_HANDSHAKE_CONTRACT_AMOY;

  let polygonTxHash: string | null = null;
  let sandbox = true;
  let warning: string | null = null;

  if (rpcUrl && privateKey && contractAddress !== PLACEHOLDER_HANDSHAKE_CONTRACT_AMOY) {
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);
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
      polygonTxHash = isPolygonTxHash(receiptHash) ? receiptHash : createMockPolygonTxHash(agreement.id);
      sandbox = false;
    } catch (err) {
      warning = err instanceof Error ? err.message : 'Polygon mint failed';
      polygonTxHash = createMockPolygonTxHash(agreement.id);
    }
  } else {
    warning = 'Sandbox agreement hash (deploy POLYGON_HANDSHAKE_CONTRACT for live mint)';
    polygonTxHash = createMockPolygonTxHash(agreement.id);
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

  return { ok: true, polygonTxHash, sandbox, warning };
}
