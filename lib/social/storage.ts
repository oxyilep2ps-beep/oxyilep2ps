/**
 * Social media storage helpers (Ghost Storage architecture).
 * Campaign DB rows are retained forever; heavy blobs may be removed after syndication.
 */

export const SOCIAL_MEDIA_BUCKET = 'social-media';
/** Bucket hard limit — must match storage.buckets.file_size_limit (2 GiB) */
export const SOCIAL_MEDIA_MAX_BYTES = 2_147_483_648;
/**
 * Frontend dropzone limit for Reels & Stories: 2000MB.
 * Kept at or under the 2GB bucket ceiling.
 */
export const SOCIAL_REEL_STORY_MAX_BYTES = 2000 * 1024 * 1024;
/** Supabase TUS resumable uploads require 6MB chunks */
export const SOCIAL_MEDIA_TUS_CHUNK_SIZE = 6 * 1024 * 1024;

export function maxUploadBytesForMediaType(mediaType: 'post' | 'reel' | 'story'): number {
  if (mediaType === 'reel' || mediaType === 'story') return SOCIAL_REEL_STORY_MAX_BYTES;
  return SOCIAL_MEDIA_MAX_BYTES;
}

/**
 * Extract object path from a public (or signed) social-media URL.
 * e.g. https://xxx.supabase.co/storage/v1/object/public/social-media/userId/file.mp4
 *   → userId/file.mp4
 */
export function extractSocialMediaStoragePath(fileUrl: string): string | null {
  const raw = fileUrl?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const path = url.pathname;

    const markers = [
      `/storage/v1/object/public/${SOCIAL_MEDIA_BUCKET}/`,
      `/storage/v1/object/sign/${SOCIAL_MEDIA_BUCKET}/`,
      `/storage/v1/object/authenticated/${SOCIAL_MEDIA_BUCKET}/`,
      `/${SOCIAL_MEDIA_BUCKET}/`,
    ];

    for (const marker of markers) {
      const idx = path.indexOf(marker);
      if (idx >= 0) {
        const objectPath = decodeURIComponent(path.slice(idx + marker.length));
        return objectPath.split('?')[0] || null;
      }
    }

    // Fallback: last two path segments (userId/filename) when URL shape is unexpected
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return decodeURIComponent(parts.slice(-2).join('/'));
    }
  } catch {
    return null;
  }

  return null;
}

export function isSocialMediaBucketUrl(fileUrl: string): boolean {
  return Boolean(extractSocialMediaStoragePath(fileUrl));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
