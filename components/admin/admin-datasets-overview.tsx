'use client';

import { useEffect, useState } from 'react';
import { Activity, Bot, ShieldAlert, TrendingUp } from 'lucide-react';
import {
  getSimulationEntitySamples,
  getSimulationLoanSamples,
  getSimulationOverviewMetrics,
  type SimulationEntitySample,
  type SimulationLoanSample,
} from '@/app/actions/simulation-data';
import { cn } from '@/lib/utils';

function MetricCard({
  label,
  value,
  icon: Icon,
  glow,
}: {
  label: string;
  value: number;
  icon: typeof Bot;
  glow: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur-md',
        glow
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />
      <div className="flex items-start justify-between">
        <div className="text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">{label}</p>
          <p className="mt-2 text-3xl font-black tabular-nums text-white">{value.toLocaleString()}</p>
        </div>
        <Icon className="text-orange-500" size={22} />
      </div>
    </div>
  );
}

export function AdminDatasetsOverview() {
  const [metrics, setMetrics] = useState({ totalBots: 0, totalActiveLoans: 0, fraudDetectionActive: 0 });
  const [entities, setEntities] = useState<SimulationEntitySample[]>([]);
  const [loans, setLoans] = useState<SimulationLoanSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [m, e, l] = await Promise.all([
          getSimulationOverviewMetrics(),
          getSimulationEntitySamples(15),
          getSimulationLoanSamples(15),
        ]);
        setMetrics(m);
        setEntities(e);
        setLoans(l);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load simulation data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* LinkedIn professional header — left-aligned primary block */}
      <div className="border-b border-neutral-800 bg-[#0A0A0A]">
        <div className="h-28 bg-gradient-to-r from-black via-[#1a1008] to-black sm:h-32" />
        <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
          <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-end gap-4 text-left">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border-4 border-black bg-neutral-900 shadow-xl ring-1 ring-orange-500/40 sm:h-24 sm:w-24">
                <Activity className="text-orange-500" size={34} />
              </div>
              <div className="pb-1">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">
                  AI Training &amp; Datasets
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Simulation Engine Overview
                </h1>
                <p className="mt-1 max-w-xl text-sm text-neutral-400">
                  Single-player bot economy · chunked Supabase ingestion · live registry
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                Ingestion pipeline active
              </span>
              <span className="rounded-full border border-neutral-700 px-3 py-1.5 text-xs font-semibold text-neutral-400">
                npm run seed:supabase
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {error ? (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
            <p className="mt-2 text-xs text-neutral-400">
              Apply migration <code className="text-orange-400">99999999999999_init_simulation_data.sql</code> then run{' '}
              <code className="text-orange-400">npm run seed:supabase</code>.
            </p>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Total Bots Ingested"
            value={loading ? 0 : metrics.totalBots}
            icon={Bot}
            glow="shadow-[0_0_40px_rgba(249,115,22,0.08)]"
          />
          <MetricCard
            label="Total Active Loans"
            value={loading ? 0 : metrics.totalActiveLoans}
            icon={TrendingUp}
            glow="shadow-[0_0_40px_rgba(249,115,22,0.12)]"
          />
          <MetricCard
            label="Fraud Detection Active"
            value={loading ? 0 : metrics.fraudDetectionActive}
            icon={ShieldAlert}
            glow="shadow-[0_0_40px_rgba(239,68,68,0.12)]"
          />
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-neutral-800 bg-[#0A0A0A] text-left">
            <div className="border-b border-neutral-800 px-4 py-3">
              <h2 className="text-sm font-bold text-white">Bot entities (sample)</h2>
              <p className="text-xs text-neutral-500">sim_entities · ordered by ESG score</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">ESG</th>
                    <th className="px-4 py-2">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                        Loading…
                      </td>
                    </tr>
                  ) : entities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                        No entities seeded yet.
                      </td>
                    </tr>
                  ) : (
                    entities.map((row) => (
                      <tr key={row.id} className="border-t border-neutral-800/80 text-neutral-300">
                        <td className="px-4 py-2.5 font-medium text-white">{row.name}</td>
                        <td className="px-4 py-2.5 capitalize">{row.entity_type}</td>
                        <td className="px-4 py-2.5 text-orange-400">{row.esg_score ?? '—'}</td>
                        <td className="px-4 py-2.5">{row.credit_rating ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-[#0A0A0A] text-left">
            <div className="border-b border-neutral-800 px-4 py-3">
              <h2 className="text-sm font-bold text-white">Commercial loans (sample)</h2>
              <p className="text-xs text-neutral-500">sim_commercial_loans · live from Supabase</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-4 py-2">Borrower</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Rate</th>
                    <th className="px-4 py-2">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                        Loading…
                      </td>
                    </tr>
                  ) : loans.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                        No loans seeded yet.
                      </td>
                    </tr>
                  ) : (
                    loans.map((row) => (
                      <tr key={row.id} className="border-t border-neutral-800/80 text-neutral-300">
                        <td className="px-4 py-2.5 font-medium text-white">{row.entity_name ?? '—'}</td>
                        <td className="px-4 py-2.5">£{row.loan_amount.toLocaleString()}</td>
                        <td className="px-4 py-2.5">{row.interest_rate ?? '—'}%</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold',
                              row.default_risk > 60
                                ? 'bg-red-500/15 text-red-400'
                                : row.default_risk > 30
                                  ? 'bg-orange-500/15 text-orange-400'
                                  : 'bg-emerald-500/15 text-emerald-400'
                            )}
                          >
                            {row.default_risk.toFixed(0)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
