'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { createPolygonRelayerWallet, getPolygonRpcUrl } from '@/lib/web3/relayer-wallet';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAdminAction } from '@/app/actions/admin-audit';

export type PlatformSettings = {
  emergency_kill_switch_active: boolean;
  updated_at: string;
};

export type CommandCenterMetrics = {
  borrowers: number;
  investors: number;
  totalLiquidity: number;
  handshakeVolume: number;
  handshakeCount: number;
};

export type Web3MonitorStats = {
  gasPriceGwei: string;
  adminWalletBalance: string;
  lowBalance: boolean;
  network: string;
  walletAddress: string | null;
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('platform_settings')
    .select('emergency_kill_switch_active, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return { emergency_kill_switch_active: false, updated_at: new Date().toISOString() };
  }

  return {
    emergency_kill_switch_active: Boolean(data.emergency_kill_switch_active),
    updated_at: String(data.updated_at),
  };
}

export async function setEmergencyKillSwitch(active: boolean): Promise<PlatformSettings> {
  const user = await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('platform_settings')
    .update({
      emergency_kill_switch_active: active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('emergency_kill_switch_active, updated_at')
    .single();

  if (error) throw new Error(error.message);

  const email = user.email ?? 'admin@oxyile.com';
  await logAdminAction(
    email,
    active ? 'Emergency kill switch ACTIVATED — platform handshakes paused' : 'Emergency kill switch deactivated'
  );

  revalidatePath('/admin-dashboard/command');
  return {
    emergency_kill_switch_active: Boolean(data.emergency_kill_switch_active),
    updated_at: String(data.updated_at),
  };
}

export async function getCommandCenterMetrics(): Promise<CommandCenterMetrics> {
  await assertAdmin();
  const admin = createAdminClient();

  const [{ count: borrowerCount }, { count: investorCount }, { data: handshakes }] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'BORROWER'),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'INVESTOR'),
    admin.from('handshakes').select('amount, status').eq('status', 'ACTIVE'),
  ]);

  const rows = handshakes ?? [];
  const totalLiquidity = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const handshakeVolume = totalLiquidity;
  const handshakeCount = rows.length;

  return {
    borrowers: borrowerCount ?? 0,
    investors: investorCount ?? 0,
    totalLiquidity,
    handshakeVolume,
    handshakeCount,
  };
}

export async function getWeb3MonitorStats(): Promise<Web3MonitorStats> {
  await assertAdmin();

  const privateKey = process.env.POLYGON_PRIVATE_KEY?.trim();

  try {
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(getPolygonRpcUrl());
    const feeData = await provider.getFeeData();
    const gasPriceGwei = feeData.gasPrice
      ? Number(ethers.formatUnits(feeData.gasPrice, 'gwei')).toFixed(2)
      : '—';

    let walletAddress: string | null = null;
    let adminWalletBalance = '—';
    let lowBalance = false;

    if (privateKey) {
      const wallet = createPolygonRelayerWallet();
      walletAddress = wallet.address;
      const balance = await provider.getBalance(wallet.address);
      const matic = Number(ethers.formatEther(balance));
      adminWalletBalance = matic.toFixed(4);
      lowBalance = matic < 2;
    }

    return {
      gasPriceGwei,
      adminWalletBalance,
      lowBalance,
      network: 'Polygon Amoy',
      walletAddress,
    };
  } catch {
    return {
      gasPriceGwei: 'Unavailable',
      adminWalletBalance: 'Unavailable',
      lowBalance: false,
      network: 'Polygon Amoy',
      walletAddress: null,
    };
  }
}
