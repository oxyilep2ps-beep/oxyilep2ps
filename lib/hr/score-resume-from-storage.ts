import type { SupabaseClient } from '@supabase/supabase-js';
import { evaluateAtsMatch, type AtsJobMatchSource } from '@/lib/hr/ats-match-score';
import { extractResumeText } from '@/lib/hr/extract-resume-text';
import { downloadResumeBuffer } from '@/lib/hr/resume-storage';

export async function scoreResumeFromStorage(
  admin: SupabaseClient,
  input: {
    resumeUrl?: string | null;
    job?: AtsJobMatchSource | null;
    fallbackBuffer?: Buffer;
    fileName?: string;
    mimeType?: string;
  }
): Promise<{ score: number; reason: string; resumeText: string }> {
  let buffer = input.fallbackBuffer;
  let fileName = input.fileName ?? '';
  let mimeType = input.mimeType ?? '';

  const downloaded = await downloadResumeBuffer(admin, input.resumeUrl ?? null);
  if (downloaded) {
    buffer = downloaded.buffer;
    fileName = downloaded.fileName;
    mimeType = downloaded.mimeType;
  } else {
    console.warn('[ats] could not download resume from storage URL; using in-memory fallback', {
      resumeUrl: input.resumeUrl,
      hasFallback: Boolean(input.fallbackBuffer?.length),
    });
  }

  if (!buffer?.length) {
    console.warn('[ats] no resume buffer — returning 0');
    const empty = evaluateAtsMatch('', input.job ?? {});
    return { score: 0, reason: empty.reason, resumeText: '' };
  }

  const resumeText = await extractResumeText(buffer, { fileName, mimeType });
  const result = evaluateAtsMatch(resumeText, input.job ?? {});
  console.log('[ats] scored resume', {
    resumeUrl: input.resumeUrl,
    chars: resumeText.length,
    score: result.score,
    reason: result.reason,
  });
  return { score: result.score, reason: result.reason, resumeText };
}

export function atsScoreColumns(score: number, reason: string) {
  const ats_score = Math.round(Math.max(0, Math.min(100, score)));
  return {
    ai_match_score: ats_score,
    ats_score,
    ats_reason: reason,
  };
}

export async function persistAtsScore(
  admin: SupabaseClient,
  table: 'job_applications' | 'job_applicants',
  id: string,
  score: number,
  reason: string
): Promise<void> {
  const payload = atsScoreColumns(score, reason);
  const { error } = await admin.from(table).update(payload).eq('id', id);
  if (!error) return;

  console.warn('[ats] full score persist failed, retrying without ats_score', table, error.message);
  const { error: retry } = await admin
    .from(table)
    .update({ ai_match_score: payload.ai_match_score, ats_reason: reason })
    .eq('id', id);
  if (!retry) return;

  console.warn('[ats] reason persist failed, writing score only', table, retry.message);
  const { error: scoreOnly } = await admin
    .from(table)
    .update({ ai_match_score: payload.ai_match_score })
    .eq('id', id);
  if (!scoreOnly) return;

  console.warn('[ats] ai_match_score persist failed, trying ats_score', table, scoreOnly.message);
  await admin.from(table).update({ ats_score: payload.ats_score, ats_reason: reason }).eq('id', id);
}
