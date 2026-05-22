'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, CheckCircle2, ImageIcon, Loader2 } from 'lucide-react';
import {
  getAdminProfile,
  uploadAdminProfileImage,
  upsertAdminProfile,
  type AdminProfileRow,
} from '@/app/actions/admin-profile';
import { ImageCropModal } from '@/components/dashboard/image-crop-modal';

type CropTarget = 'avatar' | 'cover' | null;

export function AdminProfileSettings() {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<AdminProfileRow | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [pendingAvatarBlob, setPendingAvatarBlob] = useState<Blob | null>(null);
  const [pendingCoverBlob, setPendingCoverBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cropTarget, setCropTarget] = useState<CropTarget>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = await getAdminProfile();
      if (row) {
        setProfile(row);
        setDisplayName(row.display_name ?? '');
        setBio(row.bio ?? '');
        setAvatarPreview(row.avatar_url);
        setCoverPreview(row.cover_url);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
      if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
      if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc);
    };
  }, [avatarPreview, coverPreview, cropSrc]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const openFilePicker = (target: 'avatar' | 'cover') => {
    if (target === 'avatar') avatarInputRef.current?.click();
    else coverInputRef.current?.click();
  };

  const handleFileSelected = (target: 'avatar' | 'cover', file: File) => {
    if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc);
    setCropTarget(target);
    setCropSrc(URL.createObjectURL(file));
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (!cropTarget) return;
    const previewUrl = URL.createObjectURL(blob);
    if (cropTarget === 'avatar') {
      if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
      setPendingAvatarBlob(blob);
      setAvatarPreview(previewUrl);
    } else {
      if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
      setPendingCoverBlob(blob);
      setCoverPreview(previewUrl);
    }
    if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc);
    setCropTarget(null);
    setCropSrc(null);
  };

  const saveProfile = async () => {
    if (!profile) return;
    setIsSubmitting(true);
    setToast(null);

    try {
      let nextAvatar = profile.avatar_url;
      let nextCover = profile.cover_url;

      if (pendingCoverBlob) {
        const form = new FormData();
        form.set('file', pendingCoverBlob, 'cover.jpg');
        form.set('field', 'cover');
        const result = await uploadAdminProfileImage(form);
        nextCover = result.url;
        setCoverPreview(result.url);
        setPendingCoverBlob(null);
      }

      if (pendingAvatarBlob) {
        const form = new FormData();
        form.set('file', pendingAvatarBlob, 'avatar.jpg');
        form.set('field', 'avatar');
        const result = await uploadAdminProfileImage(form);
        nextAvatar = result.url;
        setAvatarPreview(result.url);
        setPendingAvatarBlob(null);
      }

      await upsertAdminProfile({
        display_name: displayName,
        bio,
        avatar_url: nextAvatar ?? undefined,
        cover_url: nextCover ?? undefined,
      });

      setProfile((p) =>
        p
          ? {
              ...p,
              display_name: displayName,
              bio,
              avatar_url: nextAvatar,
              cover_url: nextCover,
            }
          : p
      );

      setToast({ type: 'success', text: 'Profile updated successfully' });
    } catch (e) {
      setToast({
        type: 'error',
        text: e instanceof Error ? e.message : 'Save failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  const displayAvatar = avatarPreview ?? profile.avatar_url;
  const displayCover = coverPreview ?? profile.cover_url;

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Edit profile</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            Update how other admins see you in the comms center.
          </p>
        </div>
        <Link
          href="/admin-dashboard/profile"
          className="rounded-full border border-white/50 px-4 py-2 text-sm font-semibold text-brand-600 backdrop-blur-md dark:border-white/10"
        >
          View profile
        </Link>
      </div>

      {toast && (
        <div
          role="status"
          className={
            toast.type === 'success'
              ? 'flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200'
              : 'rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
          }
        >
          {toast.type === 'success' && <CheckCircle2 size={18} />}
          {toast.text}
        </div>
      )}

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected('avatar', file);
          e.target.value = '';
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected('cover', file);
          e.target.value = '';
        }}
      />

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="relative h-36 bg-gradient-to-br from-brand-500/30 to-orange-200/40 sm:h-44">
          {displayCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayCover} alt="" className="h-full w-full object-cover" />
          ) : null}
          <button
            type="button"
            onClick={() => openFilePicker('cover')}
            disabled={isSubmitting}
            className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md hover:bg-black/65 disabled:opacity-50"
          >
            <ImageIcon size={14} /> Cover
          </button>
        </div>
        <div className="relative px-4 pb-4">
          <button
            type="button"
            onClick={() => openFilePicker('avatar')}
            disabled={isSubmitting}
            className="-mt-10 relative z-10 grid h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-brand-500/20 dark:border-neutral-900"
          >
            {displayAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center">
                <Camera className="text-brand-600" size={24} />
              </span>
            )}
          </button>
          <p className="mt-2 text-xs text-neutral-500">{profile.email}</p>
        </div>
      </div>

      <div className="glass-card space-y-4 rounded-2xl p-5">
        <label className="block text-sm">
          <span className="mb-2 block font-semibold">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl border border-white/40 bg-white/60 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-white/10 dark:bg-white/10"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-2 block font-semibold">Bio</span>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-xl border border-white/40 bg-white/60 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-white/10 dark:bg-white/10"
            placeholder="Compliance lead, product, support…"
          />
        </label>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void saveProfile()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 py-3 text-sm font-semibold text-white shadow-glow hover:bg-brand-400 disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Saving…
            </>
          ) : (
            'Save profile'
          )}
        </button>
      </div>

      {cropSrc && cropTarget && (
        <ImageCropModal
          open
          imageSrc={cropSrc}
          aspect={cropTarget === 'avatar' ? 1 : 3.2}
          title={cropTarget === 'avatar' ? 'Crop avatar' : 'Crop cover photo'}
          previewShape={cropTarget === 'avatar' ? 'circle' : 'banner'}
          onClose={() => {
            if (cropSrc.startsWith('blob:')) URL.revokeObjectURL(cropSrc);
            setCropTarget(null);
            setCropSrc(null);
          }}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
