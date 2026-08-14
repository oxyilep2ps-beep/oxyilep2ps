/**
 * Chunked, memory-safe Supabase seeding for single-player bot simulation.
 *
 * Usage:
 *   npm run seed:supabase
 *   npm run seed:supabase -- --only=sme_loans,fraud
 *   npm run seed:supabase -- --batch=3000
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'node:fs';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';

const ROOT = path.resolve(__dirname, '..');
const DATASETS_DIR = path.join(ROOT, 'DATASETS');

const DEFAULT_BATCH = 3000;
const STREAM_THRESHOLD_BYTES = 8 * 1024 * 1024; // 8MB — stream above this

type JsonRow = Record<string, unknown>;

function parseArgs() {
  const args = process.argv.slice(2);
  let batch = DEFAULT_BATCH;
  let only: string[] | null = null;
  for (const arg of args) {
    if (arg.startsWith('--batch=')) batch = Math.min(5000, Math.max(500, Number(arg.split('=')[1]) || DEFAULT_BATCH));
    if (arg.startsWith('--only=')) only = arg.split('=')[1].split(',').map((s) => s.trim());
  }
  return { batch, only };
}

function log(msg: string) {
  console.log(`[seedSupabase] ${msg}`);
}

async function upsertBatches<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  rows: T[],
  batchSize: number,
  label: string
): Promise<{ inserted: number; errors: number }> {
  if (rows.length === 0) return { inserted: 0, errors: 0 };
  const totalBatches = Math.ceil(rows.length / batchSize);
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const { error } = await supabase.from(table).upsert(batch as never, { onConflict: 'external_key' });
    if (error) {
      log(`WARN ${label} batch ${batchNum}/${totalBatches}: ${error.message} — retrying row-by-row`);
      for (const row of batch) {
        const { error: rowErr } = await supabase.from(table).upsert(row as never, { onConflict: 'external_key' });
        if (rowErr) {
          errors += 1;
          if (errors <= 5) log(`  skip row: ${rowErr.message}`);
        } else {
          inserted += 1;
        }
      }
    } else {
      inserted += batch.length;
      log(`${label} batch ${batchNum}/${totalBatches} inserted (${batch.length} rows)`);
    }
  }
  return { inserted, errors };
}

/** Stream-parse a top-level JSON array without loading the full file. */
async function streamJsonArray(
  filePath: string,
  onBatch: (rows: JsonRow[], batchIndex: number) => Promise<void>,
  batchSize: number
): Promise<number> {
  return new Promise((resolve, reject) => {
    let buffer: JsonRow[] = [];
    let batchIndex = 0;
    let total = 0;

    const pipeline = chain([createReadStream(filePath, { encoding: 'utf8' }), parser(), streamArray()]);

    pipeline.on('data', (data: { key: number; value: JsonRow }) => {
      buffer.push(data.value);
      total += 1;
      if (buffer.length >= batchSize) {
        pipeline.pause();
        const chunk = buffer;
        buffer = [];
        batchIndex += 1;
        void onBatch(chunk, batchIndex)
          .then(() => pipeline.resume())
          .catch(reject);
      }
    });

    pipeline.on('end', () => {
      void (async () => {
        if (buffer.length > 0) {
          batchIndex += 1;
          await onBatch(buffer, batchIndex);
        }
        resolve(total);
      })().catch(reject);
    });

    pipeline.on('error', reject);
  });
}

/** Load small JSON arrays fully (safe under STREAM_THRESHOLD). */
function loadJsonArray(filePath: string): JsonRow[] {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed as JsonRow[];
}

function fileSize(filePath: string): number {
  return fs.statSync(filePath).size;
}

function deriveIndividualEsg(row: JsonRow): number {
  const elec = Number(row['Electricity consumption'] ?? 0);
  const gas = Number(row['Gas consumption'] ?? 0);
  const raw = 10 - Math.min(10, (elec + gas) / 5000);
  return Math.round(Math.max(0, Math.min(10, raw)) * 100) / 100;
}

function deriveCreditRatingFromSme(row: JsonRow): string {
  return String(row.financialStrengthIndicator ?? row.riskIndicator ?? 'NR');
}

function defaultRiskFromSme(row: JsonRow): number {
  const failure = Number(row.failureScore ?? 0);
  const risk = Number(row.riskIndicator ?? 0);
  return Math.min(100, Math.max(0, failure * 0.5 + risk * 10));
}

async function seedEsgBusinessEntities(supabase: SupabaseClient, batchSize: number) {
  const file = path.join(DATASETS_DIR, 'esg_scores.json');
  if (!fs.existsSync(file)) return;
  log('Seeding business entities from esg_scores.json…');

  const ingest = async (rows: JsonRow[], batchIdx: number) => {
    const payload = rows.map((r) => ({
      external_key: `esg:${String(r['Company Name'] ?? r.Ticker ?? batchIdx).slice(0, 120)}`,
      name: String(r['Company Name'] ?? 'Unknown Corp'),
      entity_type: 'business',
      esg_score: Number(r['Overall ESG SCORE'] ?? 0),
      credit_rating: String(r['Overall ESG RATING'] ?? ''),
      geography: String(r.Country ?? ''),
      payload: r,
      updated_at: new Date().toISOString(),
    }));
    await upsertBatches(supabase, 'sim_entities', payload, batchSize, 'sim_entities (ESG)');
  };

  if (fileSize(file) > STREAM_THRESHOLD_BYTES) {
    await streamJsonArray(file, ingest, batchSize);
  } else {
    await ingest(loadJsonArray(file), 1);
  }
}

async function seedIndividualEntities(supabase: SupabaseClient, batchSize: number) {
  const file = path.join(DATASETS_DIR, 'individuals_esg_synth_data.json');
  if (!fs.existsSync(file)) return;
  log('Streaming individual bot entities from individuals_esg_synth_data.json…');

  await streamJsonArray(
    file,
    async (rows, batchIdx) => {
      const payload = rows.map((r) => ({
        external_key: `ind:${String(r.individual_ID ?? r.a ?? `${batchIdx}-${Math.random()}`)}`,
        name: String(r.name ?? 'Unknown'),
        entity_type: 'individual',
        esg_score: deriveIndividualEsg(r),
        credit_rating: r.have_a_mortgage ? 'B' : 'BB',
        geography: String(r.geography ?? r.Region ?? ''),
        payload: r,
        updated_at: new Date().toISOString(),
      }));
      await upsertBatches(supabase, 'sim_entities', payload, batchSize, 'sim_entities (individuals)');
    },
    batchSize
  );
}

async function seedSmeLoans(supabase: SupabaseClient, batchSize: number) {
  const file = path.join(DATASETS_DIR, 'sme_loans.json');
  if (!fs.existsSync(file)) return;
  log('Seeding SME commercial loans + business entities from sme_loans.json…');

  const ingest = async (rows: JsonRow[]) => {
    const entityRows = rows.map((r) => ({
      external_key: `biz:${String(r.borrowerName ?? 'unknown').replace(/\s+/g, '_')}`,
      name: String(r.borrowerName ?? 'Unknown Business'),
      entity_type: 'business',
      esg_score: null,
      credit_rating: deriveCreditRatingFromSme(r),
      geography: null,
      payload: { source: 'sme_loans', netValue: r.netValue },
      updated_at: new Date().toISOString(),
    }));
    await upsertBatches(supabase, 'sim_entities', entityRows, batchSize, 'sim_entities (SME borrowers)');

    const keys = entityRows.map((e) => e.external_key);
    const { data: entities } = await supabase
      .from('sim_entities')
      .select('id, external_key')
      .in('external_key', keys);

    const idMap = new Map((entities ?? []).map((e) => [e.external_key, e.id]));

    const loanRows = rows.map((r) => ({
      external_key: `loan:${String(r.consentId ?? r.accountId ?? r['Unnamed: 0'])}`,
      entity_id: idMap.get(`biz:${String(r.borrowerName ?? '').replace(/\s+/g, '_')}`) ?? null,
      loan_amount: Number(r.loanAmount ?? 0),
      interest_rate: Number(r.interestRate ?? 0),
      default_risk: defaultRiskFromSme(r),
      loan_status: String(r.status ?? ''),
      purpose: String(r.purpose ?? ''),
      payload: r,
    }));
    await upsertBatches(supabase, 'sim_commercial_loans', loanRows, batchSize, 'sim_commercial_loans');
  };

  if (fileSize(file) > STREAM_THRESHOLD_BYTES) {
    await streamJsonArray(file, async (rows) => ingest(rows), batchSize);
  } else {
    await ingest(loadJsonArray(file));
  }
}

async function seedFraudFlags(supabase: SupabaseClient, batchSize: number, maxRows = 50000) {
  const file = path.join(DATASETS_DIR, 'credit_card_fraud_detection.json');
  if (!fs.existsSync(file)) return;
  log(`Streaming fraud flags from credit_card_fraud_detection.json (cap ${maxRows})…`);

  let processed = 0;

  await streamJsonArray(
    file,
    async (rows, batchIdx) => {
      if (processed >= maxRows) return;
      const slice = rows.slice(0, maxRows - processed);
      processed += slice.length;

      const payload = slice.map((r, i) => {
        const features: Record<string, unknown> = {};
        for (let v = 1; v <= 28; v++) features[`V${v}`] = r[`V${v}`];
        features.Time = r.Time;
        const isFraud = String(r.Class) === '1';
        return {
          external_key: `fraud:${String(r.Time ?? batchIdx)}:${batchIdx}:${i}`,
          entity_id: null,
          amount: Number(r.Amount ?? 0),
          is_fraud: isFraud,
          risk_score: isFraud ? 0.95 : 0.15,
          feature_vector: features,
          source_dataset: 'credit_card_fraud_detection',
        };
      });

      // Prefer fraud rows + high-risk sample
      const prioritized = [
        ...payload.filter((p) => p.is_fraud),
        ...payload.filter((p) => !p.is_fraud).slice(0, Math.floor(batchSize / 2)),
      ].slice(0, batchSize);

      await upsertBatches(supabase, 'sim_fraud_flags', prioritized, batchSize, 'sim_fraud_flags');
    },
    batchSize
  );
}

async function seedMacroIndex(supabase: SupabaseClient, batchSize: number) {
  const file = path.join(DATASETS_DIR, 'us_commercial_industrial_loans.json');
  if (!fs.existsSync(file)) return;
  log('Seeding macro market index from us_commercial_industrial_loans.json…');

  const rows = loadJsonArray(file).map((r) => ({
    record_date: String(r.date),
    bus_loans_index: Number(r.busloans ?? 0),
  }));

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const { error } = await supabase.from('sim_macro_market_index').upsert(batch, { onConflict: 'record_date' });
    if (error) log(`macro batch ${batchNum} error: ${error.message}`);
    else log(`sim_macro_market_index batch ${batchNum} inserted (${batch.length} rows)`);
  }
}

async function main() {
  const { batch, only } = parseArgs();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!fs.existsSync(DATASETS_DIR)) {
    console.error(`Missing DATASETS dir: ${DATASETS_DIR}`);
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  log(`Batch size: ${batch} | Single-player bot simulation seed`);

  const run = (name: string) => !only || only.includes(name);

  if (run('esg')) await seedEsgBusinessEntities(supabase, batch);
  if (run('individuals')) await seedIndividualEntities(supabase, batch);
  if (run('sme_loans')) await seedSmeLoans(supabase, batch);
  if (run('fraud')) await seedFraudFlags(supabase, batch);
  if (run('macro')) await seedMacroIndex(supabase, batch);

  const [{ count: entities }, { count: loans }, { count: fraud }] = await Promise.all([
    supabase.from('sim_entities').select('*', { count: 'exact', head: true }),
    supabase.from('sim_commercial_loans').select('*', { count: 'exact', head: true }),
    supabase.from('sim_fraud_flags').select('*', { count: 'exact', head: true }).eq('is_fraud', true),
  ]);

  log(`Done. sim_entities≈${entities ?? 0} | sim_commercial_loans≈${loans ?? 0} | fraud_flags≈${fraud ?? 0}`);
}

main().catch((err) => {
  console.error('[seedSupabase] Fatal:', err);
  process.exit(1);
});
