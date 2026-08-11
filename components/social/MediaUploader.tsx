'use client';

import { useRef, useState } from 'react';
import { Archive, ImagePlus, Loader2, Video } from 'lucide-react';
import * as tus from 'tus-js-client';
import { createClient } from '@/lib/supabase/client';
import { AuthToast } from '@/components/auth-toast';
import { isVideoSocialMedia, mediaTypeAccept, mediaTypeAllowedMime } from '@/lib/social/media';
import {
  SOCIAL_MEDIA_BUCKET,
  SOCIAL_MEDIA_TUS_CHUNK_SIZE,
  formatBytes,
  maxUploadBytesForMediaType,
} from '@/lib/social/storage';
import type { SocialMediaType } from '@/lib/social/types';
import { cn } from '@/lib/utils';

type MediaUploaderProps = {
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  mediaType?: SocialMediaType;
  canvaUrl?: string;
  className?: string;
};

/**
 * Client-only Social Manager media uploader.
 * Uploads DIRECTLY to Supabase Storage (never through Vercel / Server Actions).
 * Large files use TUS resumable uploads with a live progress bar.
 */
export function MediaUploader({
  imageUrl,
  onImageUrlChange,
  mediaType = 'post',
  canvaUrl = 'https://www.canva.com/',
  className,
}: MediaUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const uploadViaStandard = async (
    supabase: ReturnType<typeof createClient>,
    fileName: string,
    file: File
  ) => {
    setProgress(8);
    const { error } = await supabase.storage.from(SOCIAL_MEDIA_BUCKET).upload(fileName, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });
    if (error) throw error;
    setProgress(100);
  };

  const uploadViaTus = async (fileName: string, file: File, accessToken: string) => {
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!projectUrl || !anonKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: `${projectUrl}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${accessToken}`,
          apikey: anonKey,
          'x-upsert': 'true',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: SOCIAL_MEDIA_BUCKET,
          objectName: fileName,
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
        },
        chunkSize: SOCIAL_MEDIA_TUS_CHUNK_SIZE,
        onError: (error) => {
          console.error('[MediaUploader] TUS error', error);
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const pct = bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
          setProgress(Math.min(99, pct));
        },
        onSuccess: () => {
          setProgress(100);
          resolve();
        },
      });

      upload
        .findPreviousUploads()
        .then((previousUploads) => {
          if (previousUploads.length > 0) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        })
        .catch(reject);
    });
  };

  const uploadFile = async (file: File | null | undefined) => {
    if (!file) return;

    try {
      if (!mediaTypeAllowedMime(mediaType, file.type)) {
        const hint =
          mediaType === 'post'
            ? 'Images only (JPEG, PNG, WebP, GIF).'
            : mediaType === 'reel'
              ? 'Videos only (MP4, MOV, M4V).'
              : 'Images or videos (JPEG/PNG/WebP/GIF/MP4/MOV/M4V).';
        setToast({ tone: 'error', message: `❌ Upload Failed: ${hint}` });
        return;
      }
      const maxBytes = maxUploadBytesForMediaType(mediaType);
      if (file.size > maxBytes) {
        const limitLabel =
          mediaType === 'reel' || mediaType === 'story' ? '2000MB (2GB)' : '2GB';
        setToast({
          tone: 'error',
          message: `❌ Upload Failed: File exceeds the ${limitLabel} limit (${formatBytes(file.size)}).`,
        });
        return;
      }

      setUploading(true);
      setProgress(0);
      setPreviewBroken(false);

      const supabase = createClient();
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      const user = session?.user;
      if (authError || !user || !session?.access_token) {
        const message = authError?.message || 'You must be signed in to upload.';
        console.error('[MediaUploader] auth', authError);
        setToast({ tone: 'error', message: `❌ Upload Failed: ${message}` });
        return;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${user.id}/${Date.now()}-${safeName}`;

      // Prefer TUS for anything ≥ 6MB (and always for video) so progress works + Vercel is bypassed.
      const useTus = file.size >= SOCIAL_MEDIA_TUS_CHUNK_SIZE || file.type.startsWith('video/');
      if (useTus) {
        await uploadViaTus(fileName, file, session.access_token);
      } else {
        await uploadViaStandard(supabase, fileName, file);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(SOCIAL_MEDIA_BUCKET).getPublicUrl(fileName);

      if (!publicUrl) {
        setToast({
          tone: 'error',
          message: '❌ Upload Failed: Could not resolve a public URL.',
        });
        return;
      }

      // Only the URL string is persisted via Server Actions — never the file blob.
      onImageUrlChange(publicUrl);
      setToast({
        tone: 'success',
        message: `Media uploaded (${formatBytes(file.size)}). Ready to save.`,
      });
    } catch (err) {
      console.error('[MediaUploader] unexpected', err);
      const message = err instanceof Error ? err.message : 'Unexpected upload failure';
      setToast({ tone: 'error', message: `❌ Upload Failed: ${message}` });
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const showPreview = Boolean(imageUrl?.trim()) && !previewBroken;
  const showArchived = Boolean(imageUrl?.trim()) && previewBroken;
  const showVideo = isVideoSocialMedia(mediaType, imageUrl);

  return (
    <div className={cn('space-y-3', className)}>
      <AuthToast
        open={Boolean(toast)}
        tone={toast?.tone ?? 'error'}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void uploadFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'relative overflow-hidden rounded-2xl border border-dashed border-neutral-700 bg-[#0A0A0A]',
          dragOver && 'border-orange-500/60 bg-orange-500/5'
        )}
      >
        {uploading ? (
          <div className="flex w-full flex-col items-center gap-3 px-6 py-12">
            <Loader2 className="animate-spin text-orange-500" size={28} />
            <span className="text-sm font-semibold text-neutral-200">
              Uploading to storage… {progress}%
            </span>
            <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-orange-500 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] text-neutral-500">
              Direct to Supabase · resumable · max 2GB
            </span>
          </div>
        ) : showPreview ? (
          showVideo ? (
            <video
              src={imageUrl}
              autoPlay
              loop
              muted
              playsInline
              className="max-h-56 w-full object-cover"
              onError={() => setPreviewBroken(true)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Campaign media preview"
              className="max-h-56 w-full object-cover"
              onError={() => setPreviewBroken(true)}
            />
          )
        ) : showArchived ? (
          <div className="flex w-full flex-col items-center gap-2 px-6 py-12 text-neutral-400">
            <Archive className="text-neutral-500" size={28} />
            <span className="text-sm font-semibold text-neutral-300">Media Archived</span>
            <span className="text-[11px] text-neutral-600">
              Blob removed after syndication · campaign record retained
            </span>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 px-6 py-12 text-neutral-400 disabled:opacity-60"
          >
            {mediaType === 'reel' ? (
              <Video className="text-orange-500" size={28} />
            ) : (
              <ImagePlus className="text-orange-500" size={28} />
            )}
            <span className="text-sm font-semibold">Drop media or click to upload</span>
            <span className="text-[11px] text-neutral-600">
              {mediaType === 'post' && 'Images · max 2GB · direct to Supabase'}
              {mediaType === 'reel' && 'MP4 / MOV / M4V · max 2000MB (2GB) · resumable'}
              {mediaType === 'story' && 'Images or video · max 2000MB (2GB) · resumable'}
            </span>
          </button>
        )}

        <div className="flex flex-wrap gap-2 border-t border-neutral-800 bg-neutral-950/80 p-3">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 px-3 py-1.5 text-xs font-bold text-white hover:border-orange-500/50 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : null}
            Upload asset
          </button>
          <a
            href={canvaUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-400 hover:border-orange-500/60"
          >
            🎨 Design with Canva Brand Studio
          </a>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={mediaTypeAccept(mediaType)}
          className="hidden"
          onChange={(e) => void uploadFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
