import type { SupabaseClient } from '@supabase/supabase-js';

export function resumeStoragePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const markers = [
    '/storage/v1/object/public/resumes/',
    '/storage/v1/object/sign/resumes/',
    '/storage/v1/object/authenticated/resumes/',
  ];
  for (const marker of markers) {
    const idx = trimmed.indexOf(marker);
    if (idx >= 0) {
      const rest = trimmed.slice(idx + marker.length).split('?')[0];
      return rest ? decodeURIComponent(rest) : null;
    }
  }
  if (!trimmed.includes('://') && !trimmed.startsWith('/')) return trimmed;
  return null;
}

export async function removeResumeFiles(
  admin: SupabaseClient,
  urls: Array<string | null | undefined>
): Promise<void> {
  const paths = [
    ...new Set(urls.map((url) => resumeStoragePathFromUrl(url)).filter((path): path is string => Boolean(path))),
  ];
  if (!paths.length) return;
  await admin.storage.from('resumes').remove(paths);
}
