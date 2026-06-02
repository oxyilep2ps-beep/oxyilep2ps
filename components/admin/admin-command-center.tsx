'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  Power,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getCommandCenterMetrics,
  getPlatformSettings,
  getWeb3MonitorStats,
  setEmergencyKillSwitch,
  type CommandCenterMetrics,
  type PlatformSettings,
  type Web3MonitorStats,
} from '@/app/actions/admin-platform';

const ROLE_COLORS = ['#FF5A1F', '#FF7B4A'];

export function AdminCommandCenter() {
  const [metrics, setMetrics] = useState<CommandCenterMetrics | null>(null);
  const [web3, setWeb3] = useState<Web3MonitorStats | null>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [killBusy, setKillBusy] = useState(false);
  const [confirmKill, setConfirmKill] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, w, s] = await Promise.all([
        getCommandCenterMetrics(),
        getWeb3MonitorStats(),
        getPlatformSettings(),
      ]);
      setMetrics(m);
      setWeb3(w);
      setSettings(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load command center');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleKillSwitch = async () => {
    if (!settings) return;
    if (!confirmKill && !settings.emergency_kill_switch_active) {
      setConfirmKill(true);
      return;
    }
    setKillBusy(true);
    try {
      const next = await setEmergencyKillSwitch(!settings.emergency_kill_switch_active);
      setSettings(next);
      setConfirmKill(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kill switch update failed');
    } finally {
      setKillBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  const roleData = metrics
    ? [
        { name: 'Borrowers', value: metrics.borrowers },
        { name: 'Investors', value: metrics.investors },
      ]
    : [];

  const liquidityData = metrics
    ? [
        { label: 'Total Liquidity', value: metrics.totalLiquidity },
        { label: 'Handshake Volume', value: metrics.handshakeVolume },
      ]
    : [];

  return (
    <div className="space-y-6 pb-28">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">God Mode</p>
        <h2 className="text-2xl font-black text-neutral-950 dark:text-white">Enterprise Command Center</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Live analytics, Web3 monitoring, and platform-wide emergency controls.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card rounded-2xl p-5 lg:col-span-1">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Borrowers vs Investors</p>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roleData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={4}>
                  {roleData.map((_, i) => (
                    <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs">
            {roleData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: ROLE_COLORS[i] }} />
                {d.name}: {d.value}
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 lg:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Liquidity & Handshake Volume</p>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={liquidityData}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#FF5A1F" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {metrics?.handshakeCount ?? 0} active handshakes on platform
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-brand-500" />
            <p className="text-sm font-bold text-neutral-950 dark:text-white">Web3 Monitor — {web3?.network}</p>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Gas Price</dt>
              <dd className="font-semibold">{web3?.gasPriceGwei} gwei</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Admin Wallet MATIC</dt>
              <dd className={`font-semibold ${web3?.lowBalance ? 'text-red-600' : ''}`}>
                {web3?.adminWalletBalance}
                {web3?.lowBalance && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle size={12} /> Low balance
                  </span>
                )}
              </dd>
            </div>
            {web3?.walletAddress && (
              <div className="break-all text-xs text-neutral-400">{web3.walletAddress}</div>
            )}
          </dl>
        </div>

        <div
          className={`rounded-2xl border-2 p-5 ${
            settings?.emergency_kill_switch_active
              ? 'border-red-500 bg-red-500/10'
              : 'glass-card border-red-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-red-600" />
            <p className="text-sm font-bold text-red-700 dark:text-red-400">Master Kill Switch</p>
          </div>
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">
            When active, all &quot;Initiate Handshake&quot; / proposal actions are disabled platform-wide.
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Status: {settings?.emergency_kill_switch_active ? 'PAUSED' : 'OPERATIONAL'}
          </p>
          {confirmKill && !settings?.emergency_kill_switch_active && (
            <p className="mt-3 rounded-lg bg-red-600/10 px-3 py-2 text-xs font-semibold text-red-700">
              Confirm emergency pause? This will block all new handshake proposals.
            </p>
          )}
          <button
            type="button"
            disabled={killBusy}
            onClick={() => void toggleKillSwitch()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {killBusy ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
            {settings?.emergency_kill_switch_active
              ? 'Resume Platform'
              : confirmKill
                ? 'Confirm Emergency Pause'
                : 'Emergency Pause Platform'}
          </button>
          {confirmKill && !settings?.emergency_kill_switch_active && (
            <button
              type="button"
              onClick={() => setConfirmKill(false)}
              className="mt-2 w-full text-xs text-neutral-500 underline"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
