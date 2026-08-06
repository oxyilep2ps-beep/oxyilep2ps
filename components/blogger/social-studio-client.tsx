'use client';

import { FormEvent, useMemo, useRef, useState, useTransition } from 'react';
import {
  ImagePlus,
  Linkedin,
  Loader2,
  Send,
} from 'lucide-react';
import { AuthToast } from '@/components/auth-toast';
import {
  dispatchSocialStudioPost,
  uploadSocialStudioAsset,
} from '@/app/actions/social-studio';
import { cn } from '@/lib/utils';

const HASHTAGS = ['#FinTech', '#UKLending', '#P2P', '#Oxyile', '#OpenBanking'];
const LINKEDIN_MAX = 3000;
const INSTAGRAM_MAX = 2200;

export function SocialStudioClient() {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [linkedin, setLinkedin] = useState(true);
  const [instagram, setInstagram] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedCount = Number(linkedin) + Number(instagram);
  const charLimit = Math.min(
    linkedin ? LINKEDIN_MAX : Infinity,
    instagram ? INSTAGRAM_MAX : Infinity
  );
  const charSafeLimit = Number.isFinite(charLimit) ? charLimit : LINKEDIN_MAX;

  const previewCaption = useMemo(() => caption || 'Your caption preview appears here…', [caption]);

  const upload = async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    const url = await uploadSocialStudioAsset(fd);
    setImageUrl(url);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await dispatchSocialStudioPost({
        title,
        caption,
        imageUrl,
        channels: { linkedin, instagram },
      });
      if (!result.ok) {
        setToast({ tone: 'error', message: result.error });
        return;
      }
      const messages = result.results.map((r) => r.message).join(' · ');
      const anyFail = result.results.some((r) => !r.ok);
      setToast({ tone: anyFail ? 'error' : 'success', message: messages });
    });
  };

  return (
    <div className="space-y-6">
      <AuthToast
        open={Boolean(toast)}
        tone={toast?.tone ?? 'error'}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

      <header className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5 backdrop-blur">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F97316]">
          Social Media Studio
        </p>
        <h1 className="mt-2 text-2xl font-black text-white">Craft · Preview · Publish</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-400">
          Create LinkedIn and Instagram posts independently of the blog editor. Select one channel or both,
          then dispatch to Make.com webhooks.
        </p>
      </header>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
        {/* Left — creator */}
        <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Campaign title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
              placeholder='e.g., "Q3 Lending Rates Announcement"'
            />
          </label>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void upload(e.dataTransfer.files?.[0] ?? null);
            }}
            className={cn(
              'relative overflow-hidden rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/50',
              dragOver && 'border-[#F97316]/60 bg-[#F97316]/5'
            )}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="max-h-64 w-full object-cover" />
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 px-6 py-14 text-neutral-400"
              >
                <ImagePlus className="text-[#F97316]" size={28} />
                <span className="text-sm font-semibold">Drop 1:1 or 16:9 media, or click to upload</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-3 right-3 rounded-full bg-neutral-950/80 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/10"
            >
              Change media
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void upload(e.target.files?.[0] ?? null)}
            />
          </div>

          <label className="block space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Multi-channel caption
              </span>
              <span
                className={cn(
                  'text-[11px] font-semibold',
                  caption.length > charSafeLimit ? 'text-red-400' : 'text-neutral-500'
                )}
              >
                {caption.length}/{charSafeLimit}
              </span>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, Math.max(charSafeLimit, LINKEDIN_MAX)))}
              rows={8}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
              placeholder="Write the post copy for LinkedIn / Instagram…"
              required
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {HASHTAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setCaption((c) => (c.includes(tag) ? c : `${c.trim()} ${tag}`.trim()))
                }
                className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs font-bold text-[#F97316] hover:border-[#F97316]/40"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Right — channels + preview */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <button
              type="button"
              onClick={() => setLinkedin((v) => !v)}
              className={cn(
                'rounded-xl border p-5 text-left transition',
                linkedin
                  ? 'border-[#0A66C2]/50 bg-[#0A66C2]/10'
                  : 'border-neutral-800 bg-neutral-900/60'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-bold text-white">
                  <Linkedin className="text-[#0A66C2]" size={18} /> LinkedIn Corporate Feed
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                  Webhook Ready
                </span>
              </div>
              <p className="mt-2 text-[11px] text-neutral-500">
                {linkedin ? 'Selected for this publish run' : 'Tap to include LinkedIn'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setInstagram((v) => !v)}
              className={cn(
                'rounded-xl border p-5 text-left transition',
                instagram
                  ? 'border-[#F97316]/50 bg-[#F97316]/10'
                  : 'border-neutral-800 bg-neutral-900/60'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-bold text-white">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-[#E1306C]" aria-hidden>
                    <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
                  </svg>
                  Instagram Business Visual Feed
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                  Webhook Ready
                </span>
              </div>
              <p className="mt-2 text-[11px] text-neutral-500">
                {instagram ? 'Selected for this publish run' : 'Tap to include Instagram'}
              </p>
            </button>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Live card preview</p>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="mt-3 aspect-square w-full rounded-xl object-cover" />
            ) : (
              <div className="mt-3 flex aspect-square items-center justify-center rounded-xl border border-dashed border-neutral-800 text-sm text-neutral-600">
                Media preview
              </div>
            )}
            <p className="mt-3 text-sm font-bold text-white">{title || 'Untitled campaign'}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
              {previewCaption}
            </p>
          </div>

          <button
            type="submit"
            disabled={pending || selectedCount === 0 || !caption.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F97316] px-5 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(249,115,22,0.35)] disabled:opacity-50"
          >
            {pending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            Publish to Selected Channels ({selectedCount})
          </button>
        </div>
      </form>
    </div>
  );
}
