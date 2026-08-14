/**
 * Builds dataset_manifest.json without Excel (counts JSON arrays).
 * Used so the admin UI has a manifest even if Excel conversion is still running.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'DATASETS');
const OUT = path.join(DIR, 'dataset_manifest.json');
const FALLBACK = path.join(ROOT, 'lib', 'simulation', 'dataset-manifest.fallback.json');

function countArray(filePath) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const pipeline = chain([createReadStream(filePath, { encoding: 'utf8' }), parser(), streamArray()]);
    pipeline.on('data', () => {
      n += 1;
    });
    pipeline.on('end', () => resolve(n));
    pipeline.on('error', reject);
  });
}

async function main() {
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.json') && f !== 'dataset_manifest.json')
    .sort();

  const datasets = [];
  for (const name of files) {
    const full = path.join(DIR, name);
    const slug = name.replace(/\.json$/i, '');
    const size = fs.statSync(full).size;
    let rowCount = 0;
    let error = null;
    try {
      if (size === 0) rowCount = 0;
      else if (size < 8 * 1024 * 1024) {
        const parsed = JSON.parse(fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, ''));
        rowCount = Array.isArray(parsed) ? parsed.length : parsed ? 1 : 0;
      } else {
        console.log(`Counting ${name} (${(size / 1024 / 1024).toFixed(1)} MB)…`);
        rowCount = await countArray(full);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    datasets.push({
      slug,
      source_file: name,
      row_count: rowCount,
      file_size_bytes: size,
      converted_at: new Date().toISOString(),
      excel_file: rowCount > 0 ? `${slug}.xlsx` : null,
      excel_rows_written: rowCount,
      truncated: false,
      error,
      status: error ? 'error' : rowCount === 0 ? 'discarded' : 'converted',
    });
    console.log(`  ${slug}: ${rowCount} rows`);
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    input_dir: 'DATASETS',
    output_dir: 'DATASETS_EXCEL',
    datasets,
  };
  fs.mkdirSync(path.dirname(FALLBACK), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(FALLBACK, JSON.stringify(manifest, null, 2));
  console.log(`Wrote ${datasets.length} entries → DATASETS/dataset_manifest.json and fallback`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
