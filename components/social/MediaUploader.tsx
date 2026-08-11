'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuthToast } from '@/components/auth-toast';
import { cn } from '@/lib/utils';
import type { SocialMediaType } from '@/lib/social/types';

const SOCIAL_MEDIA_BUCKET = 'social-media';
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
]);

type MediaUploaderProps = {
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  mediaType?: SocialMediaType;
  canvaUrl?: string;
  className?: string;
};

/**
 * Client-only Social Manager media uploader.
 * Uploads to the public `social-media` bucket; never throws into the RSC tree.
 */
export function MediaUploader({
  imageUrl,
  onImageUrlChange,
  mediaType = 'image',
  canvaUrl = 'https://www.canva.com/',
  className,
}: MediaUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const uploadFile = async (file: File | null | undefined) => {
    if (!file) return;

    try {
      if (!ALLOWED_TYPES.has(file.type)) {
        setToast({
          tone: 'error',
          message: '❌ Image Upload Failed: Use JPEG, PNG, WebP, GIF, MP4, or MOV (max 10MB).',
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setToast({
          tone: 'error',
          message: '❌ Image Upload Failed: File exceeds the 10MB limit.',
        });
        return;
      }

      setUploading(true);
      setPreviewBroken(false);

      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        const message = authError?.message || 'You must be signed in to upload.';
        console.error('[MediaUploader] auth', authError);
        setToast({ tone: 'error', message: `❌ Image Upload Failed: ${message}` });
        return;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${user.id}/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage.from(SOCIAL_MEDIA_BUCKET).upload(fileName, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

      if (error) {
        console.error('[MediaUploader] storage upload', error);
        setToast({
          tone: 'error',
          message: `❌ Image Upload Failed: ${error.message}`,
        });
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(SOCIAL_MEDIA_BUCKET).getPublicUrl(fileName);

      if (!publicUrl) {
        setToast({
          tone: 'error',
          message: '❌ Image Upload Failed: Could not resolve a public URL.',
        });
        return;
      }

      onImageUrlChange(publicUrl);
      setToast({ tone: 'success', message: 'Media uploaded to social-media bucket.' });
    } catch (err) {
      console.error('[MediaUploader] unexpected', err);
      const message = err instanceof Error ? err.message : 'Unexpected upload failure';
      setToast({ tone: 'error', message: `❌ Image Upload Failed: ${message}` });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const showPreview = Boolean(imageUrl?.trim()) && !previewBroken;

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
        {showPreview ? (
          mediaType === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Campaign media preview"
              className="max-h-56 w-full object-cover"
              onError={() => setPreviewBroken(true)}
            />
          ) : (
            <video
              src={imageUrl}
              controls
              className="max-h-56 w-full object-cover"
              onError={() => setPreviewBroken(true)}
            />
          )
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 px-6 py-12 text-neutral-400 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="animate-spin text-orange-500" size={28} />
            ) : (
              (mediaType === 'image' ? <ImagePlus className="text-orange-500" size={28} /> : <Video className="text-orange-500" size={28} />)
            )}
            <span className="text-sm font-semibold">
              {uploading ? 'Uploading…' : 'Drop media or click to upload'}
            </span>
            <span className="text-[11px] text-neutral-600">JPEG · PNG · WebP · GIF · MP4 · MOV · max 10MB</span>
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
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,.mov,.mp4"
          className="hidden"
          onChange={(e) => void uploadFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
