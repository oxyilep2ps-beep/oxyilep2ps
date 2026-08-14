/**
 * Single-player bot simulation dataset registry.
 * Maps local DATASETS/*.json slugs → Supabase tables for the Admin AI Training dashboard.
 *
 * Kept under lib/simulation (not lib/datasets) so Windows git ignorecase
 * cannot hide this file behind the root DATASETS/ gitignore rule.
 */

export type DatasetSimulationStatus =
  | 'active_in_simulation'
  | 'training_ai_model'
  | 'discarded'
  | 'pending_review'
  | 'conversion_error';

export type DatasetRegistryEntry = {
  slug: string;
  displayName: string;
  rowCount: number;
  status: DatasetSimulationStatus;
  featureMapping: string;
  supabaseTable: string | null;
  excelFile: string | null;
  sourceFile: string;
  truncated?: boolean;
  error?: string | null;
};

export type DatasetManifestRow = {
  slug: string;
  source_file: string;
  row_count: number;
  excel_file?: string | null;
  truncated?: boolean;
  error?: string | null;
  status?: string;
};

export type DatasetManifestFile = {
  generated_at: string;
  input_dir: string;
  output_dir: string;
  datasets: DatasetManifestRow[];
};

/** Curated mapping: datasets with tangible single-player bot simulation value. */
const SIMULATION_DATASETS: Record<
  string,
  Omit<DatasetRegistryEntry, 'slug' | 'rowCount' | 'excelFile' | 'sourceFile' | 'truncated' | 'error'>
> = {
  sme_loans: {
    displayName: 'SME Loan Book',
    status: 'active_in_simulation',
    featureMapping:
      'Powers bot borrower credit profiles, loan origination, delinquency scoring, and P2P handshake EMI simulation.',
    supabaseTable: 'sim_bot_loans',
  },
  directors_synth_data: {
    displayName: 'Corporate Directors (Synthetic KYC)',
    status: 'active_in_simulation',
    featureMapping:
      'Feeds corporate KYC bot checks: officer/UBO flags, disqualification, and company registration linkage.',
    supabaseTable: 'sim_bot_directors',
  },
  violation_tracker: {
    displayName: 'Regulatory Violation Tracker',
    status: 'active_in_simulation',
    featureMapping:
      'Compliance risk engine for bot entities — penalty history, agency, and primary offense classification.',
    supabaseTable: 'sim_compliance_violations',
  },
  factoring_synth_data: {
    displayName: 'Invoice Factoring Profiles',
    status: 'active_in_simulation',
    featureMapping:
      'SME invoice factoring bot lines — revenue, factor amount, and provider assignment for working-capital NPCs.',
    supabaseTable: 'sim_factoring_profiles',
  },
  employee_attrition: {
    displayName: 'Employee Attrition Model',
    status: 'training_ai_model',
    featureMapping:
      'HR portal NPC behavior — attrition probability, satisfaction vectors, and manager simulation inputs.',
    supabaseTable: 'sim_npc_employee_profiles',
  },
  esg_scores: {
    displayName: 'Corporate ESG Scores',
    status: 'active_in_simulation',
    featureMapping:
      'Green/sustainable lending bot scoring — E/S/G pillars for investor mandate and bond eligibility.',
    supabaseTable: 'sim_esg_company_scores',
  },
  credit_card_fraud_detection: {
    displayName: 'Transaction Fraud Features',
    status: 'training_ai_model',
    featureMapping:
      'Anomaly detection feature vectors (V1–V28) for single-player payment bot fraud scoring — sample seeded.',
    supabaseTable: 'sim_fraud_feature_rows',
  },
  us_commercial_industrial_loans: {
    displayName: 'US Commercial & Industrial Loans Index',
    status: 'active_in_simulation',
    featureMapping:
      'Macro stress index for bot economy cycles — commercial loan volume time series (not entity-level loans).',
    supabaseTable: 'sim_macro_bus_loans',
  },
  individuals_esg_synth_data: {
    displayName: 'Individual ESG Profiles (Synthetic)',
    status: 'active_in_simulation',
    featureMapping:
      'Retail bot NPCs — household energy footprint, mortgage flags, and geography for retail lending simulation.',
    supabaseTable: 'sim_individual_profiles',
  },
  cyber_attacks: {
    displayName: 'Cyber Attack Flow Events',
    status: 'active_in_simulation',
    featureMapping:
      'Security bot layer — network flow labels for fraud/cyber risk scoring in the single-player economy.',
    supabaseTable: 'sim_security_flow_events',
  },
  binance: {
    displayName: 'Binance Market Data',
    status: 'discarded',
    featureMapping: 'Empty source file — excluded from simulation.',
    supabaseTable: null,
  },
  weets: {
    displayName: 'Weets Dataset',
    status: 'discarded',
    featureMapping: 'Empty source file — excluded from simulation.',
    supabaseTable: null,
  },
  us_finance_transactions: {
    displayName: 'US Finance Transactions',
    status: 'discarded',
    featureMapping: 'Empty source file — excluded from simulation.',
    supabaseTable: null,
  },
  us_individual_transactions: {
    displayName: 'US Individual Transactions',
    status: 'discarded',
    featureMapping: 'Empty source file — excluded from simulation.',
    supabaseTable: null,
  },
  house_price_indexes: {
    displayName: 'House Price Indexes',
    status: 'discarded',
    featureMapping: 'Empty source file — excluded from simulation.',
    supabaseTable: null,
  },
  hud: {
    displayName: 'HUD Housing Data',
    status: 'discarded',
    featureMapping: 'Empty source file — excluded from simulation.',
    supabaseTable: null,
  },
  s_and_p_500: {
    displayName: 'S&P 500',
    status: 'discarded',
    featureMapping: 'Empty source file — excluded from simulation.',
    supabaseTable: null,
  },
  vehicle_manufacturer: {
    displayName: 'Vehicle Manufacturer',
    status: 'discarded',
    featureMapping: 'Empty source file — excluded from simulation.',
    supabaseTable: null,
  },
  azure_vm_cpu_readings: {
    displayName: 'Azure VM CPU Readings',
    status: 'discarded',
    featureMapping: 'Infrastructure telemetry — no bot economy mapping.',
    supabaseTable: null,
  },
  transactions_data: {
    displayName: 'Energy Grid Transactions',
    status: 'discarded',
    featureMapping: 'Out of scope for P2P lending bot simulation.',
    supabaseTable: null,
  },
  jira_to_employees: {
    displayName: 'Jira → Employees',
    status: 'discarded',
    featureMapping: 'Malformed / unusable for simulation seeding.',
    supabaseTable: null,
  },
  sms_spam_collection: {
    displayName: 'SMS Spam Collection',
    status: 'conversion_error',
    featureMapping: 'Excel conversion failed (illegal characters) — pending manual cleanup.',
    supabaseTable: null,
  },
  waste_generation: {
    displayName: 'Waste Generation',
    status: 'discarded',
    featureMapping: 'Deferred — low priority for lending simulation.',
    supabaseTable: null,
  },
  us_renewable_energy: {
    displayName: 'US Renewable Energy',
    status: 'discarded',
    featureMapping: 'Deferred — macro ESG overlay not yet wired.',
    supabaseTable: null,
  },
  green_bonds: {
    displayName: 'Green Bonds',
    status: 'discarded',
    featureMapping: 'Deferred — bond marketplace bots not yet implemented.',
    supabaseTable: null,
  },
  sustainable_bonds: {
    displayName: 'Sustainable Bonds',
    status: 'discarded',
    featureMapping: 'Deferred — bond marketplace bots not yet implemented.',
    supabaseTable: null,
  },
};

function humanizeSlug(slug: string): string {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveStatus(row: DatasetManifestRow): DatasetSimulationStatus {
  const cfg = SIMULATION_DATASETS[row.slug];

  if (row.status === 'error' || row.error) return 'conversion_error';
  if (row.status === 'discarded' || row.row_count === 0) return 'discarded';
  if (cfg?.status === 'discarded') return 'discarded';
  if (cfg?.status === 'conversion_error') return 'conversion_error';
  if (cfg?.status) return cfg.status;

  return 'pending_review';
}

/** Slugs eligible for Supabase seeding (active or training, not discarded). */
export function getUsefulDatasetSlugs(): string[] {
  return Object.entries(SIMULATION_DATASETS)
    .filter(([, cfg]) => cfg.status === 'active_in_simulation' || cfg.status === 'training_ai_model')
    .map(([slug]) => slug);
}

/** Merge conversion manifest rows with curated simulation metadata. */
export function buildRegistryFromManifest(manifest: DatasetManifestFile): DatasetRegistryEntry[] {
  return manifest.datasets.map((row) => {
    const cfg = SIMULATION_DATASETS[row.slug];
    const status = resolveStatus(row);

    return {
      slug: row.slug,
      displayName: cfg?.displayName ?? humanizeSlug(row.slug),
      rowCount: row.row_count ?? 0,
      status,
      featureMapping: cfg?.featureMapping ?? 'Pending curation for single-player bot simulation.',
      supabaseTable: cfg?.supabaseTable ?? null,
      excelFile: row.excel_file ?? null,
      sourceFile: row.source_file,
      truncated: Boolean(row.truncated),
      error: row.error ?? null,
    };
  });
}
