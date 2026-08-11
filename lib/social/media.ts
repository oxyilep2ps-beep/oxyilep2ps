import type { SocialMediaType } from '@/lib/social/types';

/** Normalize legacy DB values (image/video) to canonical post/reel/story. */
export function normalizeSocialMediaType(value: unknown): SocialMediaType {
  const raw = String(value ?? 'post').toLowerCase();
  if (raw === 'reel' || raw === 'video') return 'reel';
  if (raw === 'story') return 'story';
  return 'post';
}

export function isVideoSocialMedia(mediaType: SocialMediaType, mediaUrl?: string | null): boolean {
  const url = (mediaUrl ?? '').toLowerCase();
  if (mediaType === 'reel') return true;
  return (
    url.endsWith('.mp4') ||
    url.endsWith('.mov') ||
    url.endsWith('.webm') ||
    url.includes('video/mp4') ||
    url.includes('video/quicktime')
  );
}

export function mediaTypeAccept(mediaType: SocialMediaType): string {
  if (mediaType === 'post') return 'image/*';
  if (mediaType === 'reel') return 'video/mp4,video/quicktime,.mp4,.mov';
  return 'image/*,video/mp4,video/quicktime,.mp4,.mov';
}

export function mediaTypeAllowedMime(mediaType: SocialMediaType, mime: string): boolean {
  const isImage = mime.startsWith('image/');
  const isVideo = mime === 'video/mp4' || mime === 'video/quicktime';
  if (mediaType === 'post') return isImage;
  if (mediaType === 'reel') return isVideo;
  return isImage || isVideo;
}

export function mediaTypeBadgeClass(mediaType: SocialMediaType): string {
  if (mediaType === 'reel') return 'bg-purple-500 text-white';
  if (mediaType === 'story') return 'bg-orange-500 text-white';
  return 'bg-blue-500 text-white';
}

export function mediaTypeLabel(mediaType: SocialMediaType): string {
  if (mediaType === 'reel') return 'Reel';
  if (mediaType === 'story') return 'Story';
  return 'Post';
}
