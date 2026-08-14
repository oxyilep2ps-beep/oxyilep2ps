'use server';

import fs from 'node:fs';
import path from 'node:path';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { tryCreateAdminClient } from '@/lib/supabase/admin';

export type SimulationOverviewMetrics = {
  totalBots: number;
  totalActiveLoans: number;
  fraudDetectionActive: number;
  macroIndexPoints: number;
  averageLoanAmount: number;
  source: 'supabase' | 'local-json';
};

export type SimulationEntitySample = {
  id: string;
  name: string;
  entity_type: string;
  esg_score: number | null;
  credit_rating: string | null;
  geography: string | null;
};

export type SimulationLoanSample = {
  id: string;
  loan_amount: number;
  interest_rate: number | null;
  default_risk: number;
  loan_status: string | null;
  entity_name: string | null;
};

type FallbackSnapshot = {
  metrics: {
    totalBots: number;
    totalActiveLoans: number;
    fraudDetectionActive: number;
    macroIndexPoints: number;
    averageLoanAmount: number;
  };
  entities: SimulationEntitySample[];
  loans: SimulationLoanSample[];
};

function loadFallback(): FallbackSnapshot {
  const file = path.join(process.cwd(), 'lib', 'simulation', 'dashboard-fallback.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as FallbackSnapshot;
  return raw;
}

function fallbackMetrics(): SimulationOverviewMetrics {
  const snap = loadFallback();
  return { ...snap.metrics, source: 'local-json' };
}

export async function getSimulationOverviewMetrics(): Promise<SimulationOverviewMetrics> {
  await assertAdmin();
  const fallback = fallbackMetrics();
  const admin = tryCreateAdminClient();
  if (!admin) return fallback;

  try {
    const [entities, loans, fraud, macro, amounts] = await Promise.all([
      admin.from('sim_entities').select('*', { count: 'exact', head: true }),
      admin.from('sim_commercial_loans').select('*', { count: 'exact', head: true }),
      admin.from('sim_fraud_flags').select('*', { count: 'exact', head: true }).eq('is_fraud', true),
      admin.from('sim_macro_market_index').select('*', { count: 'exact', head: true }),
      admin.from('sim_commercial_loans').select('loan_amount').limit(5000),
    ]);

    const totalBots = entities.count ?? 0;
    const totalActiveLoans = loans.count ?? 0;
    if (totalBots <= 0 && totalActiveLoans <= 0) return fallback;

    const amountRows = amounts.data ?? [];
    const avg =
      amountRows.length > 0
        ? Math.round(
            amountRows.reduce((s, r) => s + Number(r.loan_amount ?? 0), 0) / amountRows.length
          )
        : fallback.averageLoanAmount;

    return {
      totalBots,
      totalActiveLoans,
      fraudDetectionActive: fraud.count && fraud.count > 0 ? fraud.count : fallback.fraudDetectionActive,
      macroIndexPoints: macro.count ?? fallback.macroIndexPoints,
      averageLoanAmount: avg || fallback.averageLoanAmount,
      source: 'supabase',
    };
  } catch {
    return fallback;
  }
}

export async function getSimulationEntitySamples(limit = 12): Promise<SimulationEntitySample[]> {
  await assertAdmin();
  const fallback = loadFallback().entities.slice(0, limit);
  const admin = tryCreateAdminClient();
  if (!admin) return fallback;

  try {
    const { data, error } = await admin
      .from('sim_entities')
      .select('id, name, entity_type, esg_score, credit_rating, geography')
      .order('esg_score', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error || !data || data.length === 0) return fallback;

    return data.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      entity_type: String(r.entity_type),
      esg_score: r.esg_score != null ? Number(r.esg_score) : null,
      credit_rating: (r.credit_rating as string | null) ?? null,
      geography: (r.geography as string | null) ?? null,
    }));
  } catch {
    return fallback;
  }
}

export async function getSimulationLoanSamples(limit = 12): Promise<SimulationLoanSample[]> {
  await assertAdmin();
  const fallback = loadFallback().loans.slice(0, limit);
  const admin = tryCreateAdminClient();
  if (!admin) return fallback;

  try {
    const { data, error } = await admin
      .from('sim_commercial_loans')
      .select('id, loan_amount, interest_rate, default_risk, loan_status, sim_entities(name)')
      .order('loan_amount', { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) return fallback;

    return data.map((r) => {
      const ent = r.sim_entities as { name?: string } | { name?: string }[] | null;
      const name = Array.isArray(ent) ? ent[0]?.name : ent?.name;
      return {
        id: String(r.id),
        loan_amount: Number(r.loan_amount ?? 0),
        interest_rate: r.interest_rate != null ? Number(r.interest_rate) : null,
        default_risk: Number(r.default_risk ?? 0),
        loan_status: (r.loan_status as string | null) ?? null,
        entity_name: name ?? null,
      };
    });
  } catch {
    return fallback;
  }
}
