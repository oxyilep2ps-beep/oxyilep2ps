'use client';

import { useEffect, useState } from 'react';
import { Archive } from 'lucide-react';
import { isVideoSocialMedia } from '@/lib/social/media';
import type { SocialMediaType } from '@/lib/social/types';
import { cn } from '@/lib/utils';

type SocialMediaPreviewProps = {
  url?: string | null;
  mediaType?: SocialMediaType;
  className?: string;
  /** Admin review uses controls; studio uses autoplay loop muted */
  mode?: 'studio' | 'admin';
  /** When true, empty URL shows archived (post-cleanup) instead of empty placeholder */
  treatEmptyAsArchived?: boolean;
};

/**
 * Renders campaign media, or a "Media Archived" placeholder when the blob
 * was purged by Ghost Storage cleanup after syndication.
 */
export function SocialMediaPreview({
  url,
  mediaType = 'post',
  className,
  mode = 'studio',
  treatEmptyAsArchived = false,
}: SocialMediaPreviewProps) {
  const [broken, setBroken] = useState(false);
  const trimmed = url?.trim() ?? '';

  useEffect(() => {
    setBroken(false);
  }, [trimmed]);

  if (!trimmed && !treatEmptyAsArchived) {
    return (
      <div
        className={cn(
          'flex aspect-square w-full items-center justify-center border border-dashed border-neutral-800 text-sm text-neutral-600',
          className
        )}
      >
        Media preview
      </div>
    );
  }

  if (!trimmed || broken) {
    return (
      <div
        className={cn(
          'flex aspect-square w-full flex-col items-center justify-center gap-2 bg-neutral-950 text-neutral-500',
          className
        )}
      >
        <Archive size={22} className="text-neutral-600" />
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Media Archived
        </span>
        <span className="px-3 text-center text-[10px] text-neutral-600">
          File cleared after publish · metrics retained
        </span>
      </div>
    );
  }

  const showVideo = isVideoSocialMedia(mediaType, trimmed);

  if (showVideo) {
    return (
      <video
        src={trimmed}
        controls={mode === 'admin'}
        autoPlay={mode === 'studio'}
        loop={mode === 'studio'}
        muted={mode === 'studio'}
        playsInline
        className={cn('aspect-square w-full object-cover', className)}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trimmed}
      alt=""
      className={cn('aspect-square w-full object-cover', className)}
      onError={() => setBroken(true)}
    />
  );
}
