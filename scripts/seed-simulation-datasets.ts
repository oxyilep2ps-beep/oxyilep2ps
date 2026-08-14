/**
 * Seed curated simulation datasets into Supabase (single-player bot economy).
 * Run: npm run datasets:seed
 * Requires: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  buildRegistryFromManifest,
  getUsefulDatasetSlugs,
  type DatasetManifestFile,
} from '../lib/simulation/dataset-registry';

const ROOT = path.resolve(__dirname, '..');
const DATASETS_DIR = path.join(ROOT, 'DATASETS');
const MANIFEST_PATH = path.join(DATASETS_DIR, 'dataset_manifest.json');

const SAMPLE_LIMITS: Record<string, number> = {
  sme_loans: 500,
  directors_synth_data: 400,
  violation_tracker: 250,
  factoring_synth_data: 500,
  employee_attrition: 350,
  esg_scores: 500,
  credit_card_fraud_detection: 300,
  us_commercial_industrial_loans: 99999,
  individuals_esg_synth_data: 400,
  cyber_attacks: 250,
};

function loadJson<T>(file: string): T {
  const raw = fs.readFileSync(path.join(DATASETS_DIR, file), 'utf-8').replace(/^\uFEFF/, '');
  return JSON.parse(raw) as T;
}

function sample<T>(rows: T[], limit: number): T[] {
  return rows.slice(0, Math.min(limit, rows.length));
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('Run datasets:convert first to generate dataset_manifest.json');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as DatasetManifestFile;
  const registry = buildRegistryFromManifest(manifest);

  // Upsert registry
  for (const entry of registry) {
    await admin.from('ai_dataset_registry').upsert(
      {
        slug: entry.slug,
        display_name: entry.displayName,
        source_file: entry.sourceFile,
        row_count: entry.rowCount,
        excel_file: entry.excelFile,
        simulation_status: entry.status,
        feature_mapping: entry.featureMapping,
        supabase_table: entry.supabaseTable,
        truncated: Boolean(entry.truncated),
        last_ingested_at: getUsefulDatasetSlugs().includes(entry.slug)
          ? new Date().toISOString()
          : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    );
  }

  const useful = getUsefulDatasetSlugs();

  if (useful.includes('sme_loans')) {
    type Row = Record<string, unknown>;
    const rows = sample(loadJson<Row[]>('sme_loans.json'), SAMPLE_LIMITS.sme_loans);
    await admin.from('sim_bot_loans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await admin.from('sim_bot_loans').insert(
      rows.map((r) => ({
        external_key: String(r.consentId ?? r.accountId ?? ''),
        borrower_name: String(r.borrowerName ?? 'Unknown'),
        purpose: String(r.purpose ?? ''),
        loan_amount: Number(r.loanAmount ?? 0),
        interest_rate: Number(r.interestRate ?? 0),
        status: String(r.status ?? ''),
        risk_indicator: Number(r.riskIndicator ?? 0),
        failure_score: Number(r.failureScore ?? 0),
        financial_strength_indicator: String(r.financialStrengthIndicator ?? ''),
        years_of_credit_history: Number(r.yearsOfCreditHistory ?? 0),
        delinquencies: Number(r.delinquencies ?? 0),
        payload: r,
      }))
    );
    console.log(`Seeded sim_bot_loans: ${rows.length}`);
  }

  if (useful.includes('directors_synth_data')) {
    type Row = Record<string, unknown>;
    const rows = sample(loadJson<Row[]>('directors_synth_data.json'), SAMPLE_LIMITS.directors_synth_data);
    await admin.from('sim_bot_directors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await admin.from('sim_bot_directors').insert(
      rows.map((r) => ({
        company_reg_number: Number(r.company_reg_number ?? 0),
        individual_id: Number(r.indv_id ?? 0),
        is_officer: Boolean(r.officer),
        is_ubo: Boolean(r.ubo),
        disqual: Boolean(r.disqual),
        appointment: r.appointment && r.appointment !== 'Present' ? String(r.appointment) : null,
        payload: r,
      }))
    );
    console.log(`Seeded sim_bot_directors: ${rows.length}`);
  }

  if (useful.includes('violation_tracker')) {
    type Row = Record<string, unknown>;
    const rows = sample(loadJson<Row[]>('violation_tracker.json'), SAMPLE_LIMITS.violation_tracker);
    await admin.from('sim_compliance_violations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await admin.from('sim_compliance_violations').insert(
      rows.map((r) => ({
        company_name: String(r.Company ?? 'Unknown'),
        penalty_amount: String(r['Penalty Amount'] ?? ''),
        agency: String(r.Agency ?? ''),
        primary_offense: String(r['Primary Offense'] ?? ''),
        record_year: Number(r.Year ?? 0) || null,
        hq_country: String(r['HQ Country of Parent'] ?? ''),
        payload: r,
      }))
    );
    console.log(`Seeded sim_compliance_violations: ${rows.length}`);
  }

  if (useful.includes('factoring_synth_data')) {
    type Row = Record<string, unknown>;
    const rows = sample(loadJson<Row[]>('factoring_synth_data.json'), SAMPLE_LIMITS.factoring_synth_data);
    await admin.from('sim_factoring_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await admin.from('sim_factoring_profiles').insert(
      rows.map((r) => ({
        company_reg_number: Number(r.company_reg_number ?? 0),
        revenue_2019: Number(r.revenue_2019 ?? 0),
        factor_amount: Number(r.factor_amount ?? 0),
        factor_percent: Number(r.factor_percent ?? 0),
        factoring_type: String(r.factoring_type ?? ''),
        payload: r,
      }))
    );
    console.log(`Seeded sim_factoring_profiles: ${rows.length}`);
  }

  if (useful.includes('employee_attrition')) {
    type Row = Record<string, unknown>;
    const rows = sample(loadJson<Row[]>('employee_attrition.json'), SAMPLE_LIMITS.employee_attrition);
    await admin.from('sim_npc_employee_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await admin.from('sim_npc_employee_profiles').insert(
      rows.map((r) => ({
        employee_number: Number(r.EmployeeNumber ?? 0),
        department: String(r.Department ?? ''),
        job_role: String(r.JobRole ?? ''),
        attrition: String(r.Attrition ?? ''),
        monthly_income: Number(r.MonthlyIncome ?? 0),
        overtime: String(r.OverTime ?? ''),
        payload: r,
      }))
    );
    console.log(`Seeded sim_npc_employee_profiles: ${rows.length}`);
  }

  if (useful.includes('esg_scores')) {
    type Row = Record<string, unknown>;
    const rows = sample(loadJson<Row[]>('esg_scores.json'), SAMPLE_LIMITS.esg_scores);
    await admin.from('sim_esg_company_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await admin.from('sim_esg_company_scores').insert(
      rows.map((r) => ({
        company_name: String(r['Company Name'] ?? 'Unknown'),
        country: String(r.Country ?? ''),
        sector: String(r.Sector ?? ''),
        overall_rating: String(r['Overall ESG RATING'] ?? ''),
        overall_score: Number(r['Overall ESG SCORE'] ?? 0),
        environmental_score: Number(r['Environmental SCORE'] ?? 0),
        social_score: Number(r['Social SCORE'] ?? 0),
        governance_score: Number(r['Governance SCORE'] ?? 0),
        payload: r,
      }))
    );
    console.log(`Seeded sim_esg_company_scores: ${rows.length}`);
  }

  if (useful.includes('credit_card_fraud_detection')) {
    type Row = Record<string, unknown>;
    const rows = sample(loadJson<Row[]>('credit_card_fraud_detection.json'), SAMPLE_LIMITS.credit_card_fraud_detection);
    await admin.from('sim_fraud_feature_rows').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await admin.from('sim_fraud_feature_rows').insert(
      rows.map((r) => {
        const features: Record<string, unknown> = {};
        for (let i = 1; i <= 28; i++) features[`V${i}`] = r[`V${i}`];
        features.Time = r.Time;
        return {
          amount: Number(r.Amount ?? 0),
          is_fraud: String(r.Class) === '1',
          features,
        };
      })
    );
    console.log(`Seeded sim_fraud_feature_rows: ${rows.length}`);
  }

  if (useful.includes('us_commercial_industrial_loans')) {
    type Row = { date: string; busloans: number };
    const rows = sample(loadJson<Row[]>('us_commercial_industrial_loans.json'), SAMPLE_LIMITS.us_commercial_industrial_loans);
    await admin.from('sim_macro_bus_loans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await admin.from('sim_macro_bus_loans').upsert(
      rows.map((r) => ({
        record_date: r.date,
        bus_loans_index: Number(r.busloans ?? 0),
      })),
      { onConflict: 'record_date' }
    );
    console.log(`Seeded sim_macro_bus_loans: ${rows.length}`);
  }

  if (useful.includes('individuals_esg_synth_data')) {
    type Row = Record<string, unknown>;
    const rows = sample(loadJson<Row[]>('individuals_esg_synth_data.json'), SAMPLE_LIMITS.individuals_esg_synth_data);
    await admin.from('sim_individual_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await admin.from('sim_individual_profiles').insert(
      rows.map((r) => ({
        full_name: String(r.name ?? ''),
        geography: String(r.geography ?? ''),
        postcode: String(r.postcode ?? ''),
        nationality: String(r.nationality ?? ''),
        payload: r,
      }))
    );
    console.log(`Seeded sim_individual_profiles: ${rows.length}`);
  }

  if (useful.includes('cyber_attacks')) {
    type Row = Record<string, unknown>;
    const rows = sample(loadJson<Row[]>('cyber_attacks.json'), SAMPLE_LIMITS.cyber_attacks);
    await admin.from('sim_security_flow_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await admin.from('sim_security_flow_events').insert(
      rows.map((r) => ({
        src_ip: String(r.srcip ?? ''),
        dst_ip: String(r.dstip ?? ''),
        protocol: String(r.proto ?? ''),
        service: String(r.service ?? ''),
        attack_label: String(r.label ?? r.attack_cat ?? ''),
        payload: r,
      }))
    );
    console.log(`Seeded sim_security_flow_events: ${rows.length}`);
  }

  console.log('Dataset seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
