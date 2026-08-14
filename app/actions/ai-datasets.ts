'use server';

import fs from 'node:fs';
import path from 'node:path';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildRegistryFromManifest,
  type DatasetManifestFile,
  type DatasetRegistryEntry,
} from '@/lib/datasets/registry';

const MANIFEST_PATH = path.join(process.cwd(), 'DATASETS', 'dataset_manifest.json');

function loadManifestFromDisk(): DatasetManifestFile | null {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) return null;
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as DatasetManifestFile;
  } catch {
    return null;
  }
}

export async function listAiTrainingDatasets(): Promise<{
  datasets: DatasetRegistryEntry[];
  generatedAt: string | null;
  source: 'supabase' | 'manifest';
}> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('ai_dataset_registry')
    .select('*')
    .order('display_name', { ascending: true });

  if (!error && data && data.length > 0) {
    return {
      source: 'supabase',
      generatedAt: null,
      datasets: data.map((row) => ({
        slug: String(row.slug),
        displayName: String(row.display_name),
        rowCount: Number(row.row_count ?? 0),
        status: row.simulation_status as DatasetRegistryEntry['status'],
        featureMapping: String(row.feature_mapping ?? ''),
        supabaseTable: (row.supabase_table as string | null) ?? null,
        excelFile: (row.excel_file as string | null) ?? null,
        sourceFile: String(row.source_file ?? ''),
        truncated: Boolean(row.truncated),
      })),
    };
  }

  const manifest = loadManifestFromDisk();
  if (!manifest) {
    return { datasets: [], generatedAt: null, source: 'manifest' };
  }

  return {
    source: 'manifest',
    generatedAt: manifest.generated_at,
    datasets: buildRegistryFromManifest(manifest),
  };
}

export async function getSimulationDatasetStats(): Promise<{
  active: number;
  training: number;
  discarded: number;
  totalRows: number;
}> {
  const { datasets } = await listAiTrainingDatasets();
  return {
    active: datasets.filter((d) => d.status === 'active_in_simulation').length,
    training: datasets.filter((d) => d.status === 'training_ai_model').length,
    discarded: datasets.filter((d) => d.status === 'discarded').length,
    totalRows: datasets.reduce((s, d) => s + d.rowCount, 0),
  };
}
