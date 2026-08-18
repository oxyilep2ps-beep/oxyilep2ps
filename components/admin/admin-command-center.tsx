'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  Loader2,
  Power,
  RefreshCw,
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

const ROLE_COLORS = ['#F97316', '#FB923C'];
const CARD =
  'rounded-2xl border border-gray-200 bg-white/80 dark:border-gray-800 dark:bg-[#111]/80';
const AXIS = { fill: '#6b7280', fontSize: 11 };

function fmtCount(n: number) {
  return new Intl.NumberFormat('en-GB').format(n);
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);
}

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
        <Loader2 className="animate-spin text-[#F97316]" size={32} />
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

  const metricCards = [
    {
      featured: true,
      label: 'Total borrowers',
      value: fmtCount(metrics?.borrowers ?? 0),
      hint: 'Active borrower profiles',
      href: '/admin-dashboard/applications',
    },
    {
      featured: false,
      label: 'Total investors',
      value: fmtCount(metrics?.investors ?? 0),
      hint: 'Active investor profiles',
      href: '/admin-dashboard/waitlist',
    },
    {
      featured: false,
      label: 'Live handshakes',
      value: fmtCount(metrics?.handshakeCount ?? 0),
      hint: 'Agreements currently on platform',
      href: '/admin-dashboard/handshakes',
    },
    {
      featured: false,
      label: 'Total liquidity',
      value: fmtMoney(metrics?.totalLiquidity ?? 0),
      hint: 'Committed platform capital',
      href: '/admin-dashboard/handshakes',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Live analytics, Web3 monitoring, and platform-wide emergency controls.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#ea580c]"
          >
            <RefreshCw size={16} />
            Refresh data
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-transparent px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#F97316]/40 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            <ExternalLink size={16} />
            View public site
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <article
            key={card.label}
            className={
              card.featured
                ? 'relative rounded-2xl bg-[#F97316] p-5 text-white shadow-lg shadow-[#F97316]/20'
                : `relative ${CARD} p-5`
            }
          >
            <Link
              href={card.href}
              aria-label={`Open ${card.label}`}
              className={`absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full ${
                card.featured ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-500 hover:text-[#F97316] dark:bg-white/5 dark:text-gray-400'
              }`}
            >
              <ArrowUpRight size={16} />
            </Link>
            <p className={`text-xs font-semibold uppercase tracking-wider ${card.featured ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
              {card.label}
            </p>
            <p className={`mt-3 text-3xl font-black tracking-tight ${card.featured ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{card.value}</p>
            <p className={`mt-3 text-xs ${card.featured ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{card.hint}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${CARD} p-5 lg:col-span-1`}>
          <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">Borrowers vs Investors</p>
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
          <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {roleData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: ROLE_COLORS[i] }} />
                {d.name}: {d.value}
              </span>
            ))}
          </div>
        </div>

        <div className={`${CARD} p-5 lg:col-span-2`}>
          <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">Liquidity & Handshake Volume</p>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={liquidityData}>
                <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#F97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {metrics?.handshakeCount ?? 0} active handshakes on platform
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={`${CARD} p-5`}>
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-[#F97316]" />
            <p className="text-sm font-bold text-gray-900 dark:text-white">Web3 Monitor — {web3?.network}</p>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Gas Price</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{web3?.gasPriceGwei} gwei</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Admin Wallet MATIC</dt>
              <dd className={`font-semibold ${web3?.lowBalance ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {web3?.adminWalletBalance}
                {web3?.lowBalance && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <AlertTriangle size={12} /> Low balance
                  </span>
                )}
              </dd>
            </div>
            {web3?.walletAddress && (
              <div className="break-all text-xs text-gray-500 dark:text-gray-400">{web3.walletAddress}</div>
            )}
          </dl>
        </div>

        <div
          className={`rounded-2xl border-2 p-5 ${
            settings?.emergency_kill_switch_active
              ? 'border-red-500 bg-red-500/10'
              : `${CARD} border-red-500/30`
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-red-500" />
            <p className="text-sm font-bold text-red-600 dark:text-red-400">Master Kill Switch</p>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            When active, all &quot;Initiate Handshake&quot; / proposal actions are disabled platform-wide.
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Status: {settings?.emergency_kill_switch_active ? 'PAUSED' : 'OPERATIONAL'}
          </p>
          {confirmKill && !settings?.emergency_kill_switch_active && (
            <p className="mt-3 rounded-lg bg-red-600/10 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-400">
              Confirm emergency pause? This will block all new handshake proposals.
            </p>
          )}
          <button
            type="button"
            disabled={killBusy}
            onClick={() => void toggleKillSwitch()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
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
              className="mt-2 w-full text-xs text-gray-500 underline dark:text-gray-400"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
