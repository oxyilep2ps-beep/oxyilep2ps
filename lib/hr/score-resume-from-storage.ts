import type { SupabaseClient } from '@supabase/supabase-js';
import { computeAtsMatchScore, type AtsJobMatchSource } from '@/lib/hr/ats-match-score';
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
): Promise<{ score: number; resumeText: string }> {
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
    return { score: 0, resumeText: '' };
  }

  const resumeText = await extractResumeText(buffer, { fileName, mimeType });
  const score = computeAtsMatchScore(resumeText, input.job ?? {});
  console.log('[ats] scored resume', {
    resumeUrl: input.resumeUrl,
    chars: resumeText.length,
    score,
  });
  return { score, resumeText };
}
