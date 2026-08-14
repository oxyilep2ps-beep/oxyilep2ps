'use server';

import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export type SimulationOverviewMetrics = {
  totalBots: number;
  totalActiveLoans: number;
  fraudDetectionActive: number;
  macroIndexPoints: number;
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

export async function getSimulationOverviewMetrics(): Promise<SimulationOverviewMetrics> {
  await assertAdmin();
  const admin = createAdminClient();

  const [entities, loans, fraud, macro] = await Promise.all([
    admin.from('sim_entities').select('*', { count: 'exact', head: true }),
    admin
      .from('sim_commercial_loans')
      .select('*', { count: 'exact', head: true })
      .in('loan_status', ['Ongoing', 'Active', 'ongoing', 'active']),
    admin.from('sim_fraud_flags').select('*', { count: 'exact', head: true }).eq('is_fraud', true),
    admin.from('sim_macro_market_index').select('*', { count: 'exact', head: true }),
  ]);

  const totalActiveLoans =
    loans.count && loans.count > 0
      ? loans.count
      : (await admin.from('sim_commercial_loans').select('*', { count: 'exact', head: true })).count ?? 0;

  return {
    totalBots: entities.count ?? 0,
    totalActiveLoans,
    fraudDetectionActive: fraud.count ?? 0,
    macroIndexPoints: macro.count ?? 0,
  };
}

export async function getSimulationEntitySamples(limit = 12): Promise<SimulationEntitySample[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('sim_entities')
    .select('id, name, entity_type, esg_score, credit_rating, geography')
    .order('esg_score', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    entity_type: String(r.entity_type),
    esg_score: r.esg_score != null ? Number(r.esg_score) : null,
    credit_rating: (r.credit_rating as string | null) ?? null,
    geography: (r.geography as string | null) ?? null,
  }));
}

export async function getSimulationLoanSamples(limit = 12): Promise<SimulationLoanSample[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('sim_commercial_loans')
    .select('id, loan_amount, interest_rate, default_risk, loan_status, sim_entities(name)')
    .order('loan_amount', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => {
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
}
