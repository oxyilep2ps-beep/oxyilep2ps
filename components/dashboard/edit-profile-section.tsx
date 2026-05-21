'use client';

import { useCallback, useEffect, useState } from 'react';
import { Camera, ImageIcon, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { checkUsernameAvailable, updateProfileFields } from '@/app/actions/profile';
import { uploadProfileImage } from '@/lib/profile/storage';
import { ImageCropModal } from '@/components/dashboard/image-crop-modal';
import { UserProfile, type PublicProfileCard } from '@/components/dashboard/user-profile';

type CropTarget = 'avatar' | 'cover' | null;

type EditableProfile = PublicProfileCard & {
  postal_code?: string | null;
  borrower_sort_code?: string | null;
  borrower_account_number?: string | null;
};

export function EditProfileSection() {
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [borrowerSortCode, setBorrowerSortCode] = useState('');
  const [borrowerAccountNumber, setBorrowerAccountNumber] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<CropTarget>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select(
        'id, role, full_legal_name, username, bio, avatar_url, cover_url, postal_code, borrower_sort_code, borrower_account_number'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      const p = data as EditableProfile;
      setProfile(p);
      setUsername(p.username ?? '');
      setBio(p.bio ?? '');
      setPostalCode(p.postal_code ?? '');
      setBorrowerSortCode(p.borrower_sort_code ?? '');
      setBorrowerAccountNumber(p.borrower_account_number ?? '');
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !cropTarget) return;

    setSaving(true);
    try {
      const bucket = cropTarget === 'avatar' ? 'avatars' : 'covers';
      const url = await uploadProfileImage(supabase, user.id, bucket, blob, `${cropTarget}.jpg`);
      const field = cropTarget === 'avatar' ? { avatar_url: url } : { cover_url: url };
      const result = await updateProfileFields(field);
      if (!result.success) throw new Error(result.error);
      await loadProfile();
      setMessage(`${cropTarget === 'avatar' ? 'Avatar' : 'Cover'} updated.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setSaving(false);
      setCropTarget(null);
      setCropSrc(null);
    }
  };

  const validateUsername = async () => {
    if (!username.trim()) {
      setUsernameStatus(null);
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const result = await checkUsernameAvailable(username, user?.id);
    setUsernameStatus(result.available ? 'Username is available' : result.error ?? 'Taken');
  };

  const saveMeta = async () => {
    setSaving(true);
    setMessage(null);
    const result = await updateProfileFields({
      username,
      bio,
      postal_code: postalCode,
      ...(profile?.role === 'BORROWER'
        ? {
            borrower_sort_code: borrowerSortCode,
            borrower_account_number: borrowerAccountNumber,
          }
        : {}),
    });
    setSaving(false);
    if (!result.success) {
      setMessage(result.error ?? 'Save failed');
      return;
    }
    setMessage('Profile saved.');
    await loadProfile();
  };

  if (!profile) {
    return (
      <div className="glass-card mt-6 flex items-center justify-center rounded-2xl p-8 text-neutral-500">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h2 className="text-lg font-black text-neutral-950 dark:text-white">Edit Profile</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Crop your avatar and cover, set a unique @username, compliance fields, and your bio.
        </p>
      </div>

      <div className="glass-card grid gap-3 rounded-2xl p-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => pickImage('avatar')}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-500/5 py-4 text-sm font-semibold text-brand-600 dark:text-brand-300"
        >
          <Camera size={18} /> Upload & crop avatar
        </button>
        <button
          type="button"
          onClick={() => pickImage('cover')}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-500/5 py-4 text-sm font-semibold text-brand-600 dark:text-brand-300"
        >
          <ImageIcon size={18} /> Upload & crop cover
        </button>
      </div>

      <div className="glass-card space-y-4 rounded-2xl p-5">
        <label className="block text-sm">
          <span className="mb-2 block font-semibold text-neutral-700 dark:text-neutral-300">Postal Code</span>
          <input
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
            className="w-full rounded-xl border border-white/40 bg-white/70 px-4 py-3 outline-none dark:border-white/10 dark:bg-black/40"
            placeholder="SW1A 1AA"
            autoComplete="postal-code"
          />
        </label>

        {profile.role === 'BORROWER' && (
          <div className="space-y-4 rounded-xl border border-brand-200/50 bg-brand-500/5 p-4 dark:border-brand-500/20">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
              Borrower bank details
            </p>
            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-neutral-700 dark:text-neutral-300">Bank Sort Code</span>
              <input
                value={borrowerSortCode}
                onChange={(e) => setBorrowerSortCode(e.target.value)}
                className="w-full rounded-xl border border-white/40 bg-white/70 px-4 py-3 outline-none dark:border-white/10 dark:bg-black/40"
                placeholder="00-00-00"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-neutral-700 dark:text-neutral-300">Account Number</span>
              <input
                value={borrowerAccountNumber}
                onChange={(e) => setBorrowerAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="w-full rounded-xl border border-white/40 bg-white/70 px-4 py-3 outline-none dark:border-white/10 dark:bg-black/40"
                placeholder="12345678"
                inputMode="numeric"
              />
            </label>
          </div>
        )}

        <label className="block text-sm">
          <span className="mb-2 block font-semibold text-neutral-700 dark:text-neutral-300">Username</span>
          <div className="flex items-center gap-2 rounded-xl border border-white/40 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-black/40">
            <span className="text-neutral-400">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, '_').toLowerCase())}
              onBlur={validateUsername}
              className="w-full bg-transparent outline-none"
              placeholder="your_unique_handle"
            />
          </div>
          {usernameStatus && (
            <p className={`mt-1 text-xs ${usernameStatus.includes('available') ? 'text-emerald-600' : 'text-amber-600'}`}>
              {usernameStatus}
            </p>
          )}
        </label>

        <label className="block text-sm">
          <span className="mb-2 block font-semibold text-neutral-700 dark:text-neutral-300">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={280}
            className="w-full rounded-xl border border-white/40 bg-white/70 px-4 py-3 outline-none dark:border-white/10 dark:bg-black/40"
            placeholder="Tell investors or borrowers about your goals…"
          />
        </label>

        <p className="text-xs text-neutral-500">
          Legal name <span className="font-semibold text-neutral-700 dark:text-neutral-300">{profile.full_legal_name}</span> is
          verified and cannot be edited here.
        </p>

        <button
          type="button"
          onClick={saveMeta}
          disabled={saving}
          className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-glow hover:bg-brand-400 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {message && <p className="text-sm text-neutral-600 dark:text-neutral-300">{message}</p>}
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-500">Live preview</p>
        <UserProfile profile={{ ...profile, username, bio }} />
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
