'use client';

import { useCallback, useEffect, useState } from 'react';
import { Camera, ImageIcon, Loader2 } from 'lucide-react';
import { getAdminProfile, upsertAdminProfile, uploadAdminProfileImage, type AdminProfileRow } from '@/app/actions/admin-profile';
import { ImageCropModal } from '@/components/dashboard/image-crop-modal';

type CropTarget = 'avatar' | 'cover' | null;

export function AdminProfileSettings() {
  const [profile, setProfile] = useState<AdminProfileRow | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<CropTarget>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const load = useCallback(async () => {
    const row = await getAdminProfile();
    if (row) {
      setProfile(row);
      setDisplayName(row.display_name ?? '');
      setBio(row.bio ?? '');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pickImage = (target: CropTarget) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setCropTarget(target);
      setCropSrc(URL.createObjectURL(file));
    };
    input.click();
  };

  const handleCropSave = async (blob: Blob) => {
    if (!cropTarget) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.set('file', blob, `${cropTarget}.jpg`);
      form.set('field', cropTarget);
      await uploadAdminProfileImage(form);
      await load();
      setMessage(`${cropTarget === 'avatar' ? 'Avatar' : 'Cover'} updated.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setSaving(false);
      setCropTarget(null);
      setCropSrc(null);
    }
  };

  const saveMeta = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await upsertAdminProfile({ display_name: displayName, bio });
      await load();
      setMessage('Profile saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Admin profile</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Visible only to other administrators in the comms center.
        </p>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <div
          className="relative h-32 bg-gradient-to-br from-brand-500/30 to-orange-200/40 sm:h-40"
          style={
            profile.cover_url
              ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: 'cover' }
              : undefined
          }
        >
          <button
            type="button"
            onClick={() => pickImage('cover')}
            className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
          >
            <ImageIcon size={14} /> Cover
          </button>
        </div>
        <div className="relative px-4 pb-4">
          <button
            type="button"
            onClick={() => pickImage('avatar')}
            className="-mt-10 grid h-20 w-20 place-items-center overflow-hidden rounded-full border-4 border-white bg-brand-500/20 dark:border-neutral-900"
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Camera className="text-brand-600" size={24} />
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
            className="w-full rounded-xl border border-white/40 bg-white/60 px-4 py-3 outline-none dark:border-white/10 dark:bg-white/10"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-2 block font-semibold">Bio</span>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-xl border border-white/40 bg-white/60 px-4 py-3 outline-none dark:border-white/10 dark:bg-white/10"
            placeholder="Compliance lead, product, support…"
          />
        </label>
        {message && <p className="text-sm text-brand-700 dark:text-brand-300">{message}</p>}
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveMeta()}
          className="w-full rounded-full bg-brand-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save profile'}
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
            setCropTarget(null);
            setCropSrc(null);
          }}
          onConfirm={handleCropSave}
        />
      )}
    </div>
  );
}
