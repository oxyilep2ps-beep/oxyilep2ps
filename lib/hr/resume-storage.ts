import type { SupabaseClient } from '@supabase/supabase-js';

function guessResumeMime(fileName: string): string {
  const name = fileName.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (name.endsWith('.doc')) return 'application/msword';
  return 'application/octet-stream';
}

export function resumeStoragePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const fromMarker = trimmed.match(
    /\/object\/(?:public|sign|authenticated)\/resumes\/(.+?)(?:\?|$)/i
  );
  if (fromMarker?.[1]) {
    try {
      return decodeURIComponent(fromMarker[1]);
    } catch {
      return fromMarker[1];
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

/** Fetch the resume bytes from the `resumes` bucket (path or public URL). */
export async function downloadResumeBuffer(
  admin: SupabaseClient,
  resumeUrl: string | null | undefined
): Promise<{ buffer: Buffer; fileName: string; mimeType: string } | null> {
  const path = resumeStoragePathFromUrl(resumeUrl);
  if (path) {
    const { data, error } = await admin.storage.from('resumes').download(path);
    if (error) {
      console.warn('[ats] storage.download failed', { path, message: error.message });
    } else if (data) {
      const buffer = Buffer.from(await data.arrayBuffer());
      console.log('[ats] downloaded resume from Supabase storage', { path, bytes: buffer.length });
      return {
        buffer,
        fileName: path,
        mimeType: data.type || guessResumeMime(path),
      };
    }
  }

  const url = String(resumeUrl ?? '').trim();
  if (!/^https?:\/\//i.test(url)) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('[ats] fetch resume URL failed', { url, status: res.status });
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const fileName = path || url.split('/').pop()?.split('?')[0] || 'resume.pdf';
    console.log('[ats] downloaded resume from public URL', { url, bytes: buffer.length });
    return {
      buffer,
      fileName,
      mimeType: res.headers.get('content-type') || guessResumeMime(fileName),
    };
  } catch (err) {
    console.warn('[ats] fetch resume URL threw', err);
    return null;
  }
}
