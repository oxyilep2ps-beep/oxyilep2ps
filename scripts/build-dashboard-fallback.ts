/**
 * Snapshot sme_loans.json + individuals_esg_synth_data.json into a small
 * committed JSON file the admin dashboard can use when Supabase is empty.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'DATASETS');
const OUT = path.join(ROOT, 'lib', 'simulation', 'dashboard-fallback.json');

type JsonRow = Record<string, unknown>;

function takeFirst(filePath: string, limit: number): Promise<JsonRow[]> {
  return new Promise((resolve, reject) => {
    const rows: JsonRow[] = [];
    const pipeline = chain([createReadStream(filePath, { encoding: 'utf8' }), parser(), streamArray()]);
    pipeline.on('data', (data: { value: JsonRow }) => {
      if (rows.length < limit) rows.push(data.value);
      else pipeline.destroy();
    });
    pipeline.on('close', () => resolve(rows));
    pipeline.on('end', () => resolve(rows));
    pipeline.on('error', (err) => {
      if (rows.length > 0) resolve(rows);
      else reject(err);
    });
  });
}

function deriveIndividualEsg(row: JsonRow): number {
  const elec = Number(row['Electricity consumption'] ?? 0);
  const gas = Number(row['Gas consumption'] ?? 0);
  const raw = 10 - Math.min(10, (elec + gas) / 5000);
  return Math.round(Math.max(0, Math.min(10, raw)) * 100) / 100;
}

async function main() {
  const smePath = path.join(DIR, 'sme_loans.json');
  const indPath = path.join(DIR, 'individuals_esg_synth_data.json');
  const esgPath = path.join(DIR, 'esg_scores.json');
  const manifestPath = path.join(DIR, 'dataset_manifest.json');

  let totalIndividuals = 40000;
  let totalEsg = 15646;
  let totalSme = 3000;
  let fraudActive = 492;

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      datasets: { slug: string; row_count: number }[];
    };
    const find = (slug: string) => manifest.datasets.find((d) => d.slug === slug)?.row_count;
    totalIndividuals = find('individuals_esg_synth_data') ?? totalIndividuals;
    totalEsg = find('esg_scores') ?? totalEsg;
    totalSme = find('sme_loans') ?? totalSme;
    const fraudRows = find('credit_card_fraud_detection') ?? 284807;
    fraudActive = Math.max(492, Math.round(fraudRows * 0.0017));
  }

  const smeAll: JsonRow[] = fs.existsSync(smePath)
    ? (JSON.parse(fs.readFileSync(smePath, 'utf8').replace(/^\uFEFF/, '')) as JsonRow[])
    : [];
  const individuals = fs.existsSync(indPath) ? await takeFirst(indPath, 40) : [];

  const loans = smeAll.slice(0, 40).map((r, i) => {
    const failure = Number(r.failureScore ?? 0);
    const risk = Number(r.riskIndicator ?? 0);
    return {
      id: `loan-fb-${i}`,
      loan_amount: Number(r.loanAmount ?? 0),
      interest_rate: Number(r.interestRate ?? 0),
      default_risk: Math.min(100, Math.max(0, failure * 0.5 + risk * 10)),
      loan_status: String(r.status ?? 'Ongoing'),
      entity_name: String(r.borrowerName ?? 'Unknown Business'),
    };
  });

  const amounts = smeAll.map((r) => Number(r.loanAmount ?? 0)).filter((n) => Number.isFinite(n) && n > 0);
  const avg = amounts.length ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
  const activeLoans = smeAll.filter((r) => {
    const s = String(r.status ?? '').toLowerCase();
    return !s || s.includes('ongoing') || s.includes('active') || s.includes('open');
  }).length;

  const entities = [
    ...individuals.slice(0, 20).map((r, i) => ({
      id: `ind-fb-${i}`,
      name: String(r.name ?? `Individual ${i + 1}`),
      entity_type: 'individual' as const,
      esg_score: deriveIndividualEsg(r),
      credit_rating: r.have_a_mortgage ? 'B' : 'BB',
      geography: String(r.geography ?? r.Region ?? ''),
    })),
  ];

  if (fs.existsSync(esgPath)) {
    const esg = JSON.parse(fs.readFileSync(esgPath, 'utf8').replace(/^\uFEFF/, '')) as JsonRow[];
    for (const r of esg.slice(0, 15)) {
      entities.push({
        id: `esg-fb-${entities.length}`,
        name: String(r['Company Name'] ?? 'Unknown Corp'),
        entity_type: 'business',
        esg_score: Number(r['Overall ESG SCORE'] ?? 0),
        credit_rating: String(r['Overall ESG RATING'] ?? ''),
        geography: String(r.Country ?? ''),
      });
    }
  }

  const snapshot = {
    source: 'local-json-fallback',
    generated_at: new Date().toISOString(),
    metrics: {
      totalBots: totalIndividuals + totalEsg,
      totalActiveLoans: activeLoans || totalSme,
      fraudDetectionActive: fraudActive,
      macroIndexPoints: 886,
      averageLoanAmount: Math.round(avg),
    },
    entities: entities.slice(0, 15),
    loans: loans.slice(0, 15),
  };

  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2));
  console.log(
    `Wrote ${OUT} bots=${snapshot.metrics.totalBots} loans=${snapshot.metrics.totalActiveLoans} avg=${snapshot.metrics.averageLoanAmount}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
