export const WORKING_MODELS = ['Remote', 'On-site', 'Hybrid'] as const;
export type WorkingModel = (typeof WORKING_MODELS)[number];

const WORKING_MODEL_SET = new Set<string>(WORKING_MODELS);

export function isWorkingModel(value: string): value is WorkingModel {
  return WORKING_MODEL_SET.has(value);
}

/** Map a stored working_model or legacy location string to Remote | On-site | Hybrid. */
export function normalizeWorkingModel(value: string | null | undefined): WorkingModel {
  const raw = String(value ?? '').trim();
  if (isWorkingModel(raw)) return raw;

  const lower = raw.toLowerCase();
  if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('office')) {
    return 'On-site';
  }
  if (lower.includes('hybrid')) return 'Hybrid';
  if (lower.includes('remote')) return 'Remote';
  return 'Hybrid';
}

export function jobWorkingModel(job: {
  working_model?: string | null;
  location?: string | null;
}): WorkingModel {
  return normalizeWorkingModel(job.working_model || job.location);
}
