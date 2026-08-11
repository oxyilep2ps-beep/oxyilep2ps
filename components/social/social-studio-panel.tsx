'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2, Save, Send } from 'lucide-react';
import {
  getSocialWebhookHealth,
  listSocialCampaigns,
  saveSocialCampaignDraft,
  submitSocialCampaignForApproval,
} from '@/app/actions/social-campaigns';
import { AuthToast } from '@/components/auth-toast';
import { MediaUploader } from '@/components/social/MediaUploader';
import { isVideoSocialMedia, normalizeSocialMediaType } from '@/lib/social/media';
import type { SocialCampaignRow, SocialMediaType } from '@/lib/social/types';
import { cn } from '@/lib/utils';

const HASHTAGS = ['#FinTech', '#UKLending', '#P2P', '#Oxyile'];
const LINKEDIN_MAX = 3000;
const INSTAGRAM_MAX = 2200;

export function SocialStudioPanel() {
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState<SocialCampaignRow[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [campaignName, setCampaignName] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mediaType, setMediaType] = useState<SocialMediaType>('post');
  const [linkedin, setLinkedin] = useState(true);
  const [instagram, setInstagram] = useState(false);
  const [status, setStatus] = useState<SocialCampaignRow['status']>('draft');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [canvaUrl, setCanvaUrl] = useState('https://www.canva.com/');
  const [previewBroken, setPreviewBroken] = useState(false);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const charLimit = Math.min(
    linkedin ? LINKEDIN_MAX : Infinity,
    instagram ? INSTAGRAM_MAX : Infinity
  );
  const charSafe = Number.isFinite(charLimit) ? charLimit : LINKEDIN_MAX;
  const preview = useMemo(() => caption || 'Your caption preview appears here…', [caption]);
  const showTitle = mediaType === 'post';
  const showCaption = mediaType === 'post' || mediaType === 'reel';
  const canSubmit =
    Boolean(imageUrl.trim()) &&
    (linkedin || instagram) &&
    (mediaType === 'story' || Boolean(caption.trim()));

  useEffect(() => {
    void (async () => {
      try {
        const [rows, health] = await Promise.all([listSocialCampaigns(), getSocialWebhookHealth()]);
        setCampaigns(rows);
        setCanvaUrl(health.canvaUrl);
      } catch (err) {
        console.error('[SocialStudioPanel] load failed', err);
        setCampaigns([]);
        setToast({
          tone: 'error',
          message: err instanceof Error ? err.message : 'Failed to load campaigns',
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (searchParams.get('new') === '1') resetNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadCampaign = (row: SocialCampaignRow) => {
    const type = normalizeSocialMediaType(row.media_type);
    setActiveId(row.id);
    setCampaignName(row.campaign_name);
    setTitle(row.title);
    setCaption(row.caption);
    setImageUrl(row.image_url);
    setMediaType(type);
    setPreviewBroken(false);
    setLinkedin(Boolean(row.channels.linkedin));
    setInstagram(Boolean(row.channels.instagram));
    setStatus(row.status);
    setRejectionReason(row.rejection_reason);
  };

  const resetNew = () => {
    setActiveId(undefined);
    setCampaignName('');
    setTitle('');
    setCaption('');
    setImageUrl('');
    setMediaType('post');
    setPreviewBroken(false);
    setLinkedin(true);
    setInstagram(false);
    setStatus('draft');
    setRejectionReason(null);
  };

  const onMediaTypeChange = (next: SocialMediaType) => {
    setMediaType(next);
    if (next === 'story') {
      setTitle('');
      setCaption('');
    } else if (next === 'reel') {
      setTitle('');
    }
  };

  const payload = () => ({
    id: activeId,
    campaignName,
    title: showTitle ? title : '',
    caption: showCaption ? caption : '',
    imageUrl,
    mediaType,
    channels: { linkedin, instagram },
  });

  const onSaveDraft = () => {
    startTransition(async () => {
      const result = await saveSocialCampaignDraft(payload());
      if (!result.ok) {
        setToast({ tone: 'error', message: result.error });
        return;
      }
      setActiveId(result.campaign.id);
      setStatus(result.campaign.status);
      setToast({ tone: 'success', message: 'Draft saved.' });
      setCampaigns(await listSocialCampaigns());
    });
  };

  const onSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    startTransition(async () => {
      const result = await submitSocialCampaignForApproval(payload());
      if (!result.ok) {
        setToast({ tone: 'error', message: result.error });
        return;
      }
      setActiveId(result.campaign.id);
      setStatus(result.campaign.status);
      setRejectionReason(null);
      setToast({
        tone: 'success',
        message: 'Submitted for Admin Approval. Make.com fires only after Admin Approve & Publish.',
      });
      setCampaigns(await listSocialCampaigns());
    });
  };

  const mediaTypeOptions: { id: SocialMediaType; label: string }[] = [
    { id: 'post', label: 'Post (Image)' },
    { id: 'reel', label: 'Reel (Video)' },
    { id: 'story', label: 'Story' },
  ];

  return (
    <div className="space-y-6">
      <AuthToast
        open={Boolean(toast)}
        tone={toast?.tone ?? 'error'}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

      {status === 'rejected' ? (
        <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4 text-orange-100 backdrop-blur">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 shrink-0 text-orange-400" size={18} />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-orange-300">
                Campaign rejected by Admin
              </p>
              <p className="mt-1 text-sm">
                Reason: {rejectionReason?.trim() || 'No reason provided. Edit and re-submit.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <aside className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-3">
          <button
            type="button"
            onClick={resetNew}
            className="w-full rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white"
          >
            + New campaign
          </button>
          <div className="max-h-[28rem] space-y-1 overflow-y-auto">
            {campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => loadCampaign(c)}
                className={cn(
                  'w-full rounded-xl px-3 py-2 text-left text-xs transition hover:bg-neutral-800/60',
                  activeId === c.id ? 'bg-orange-500/15 text-orange-500' : 'text-neutral-300'
                )}
              >
                <p className="truncate font-semibold">{c.campaign_name}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-500">
                  {normalizeSocialMediaType(c.media_type)} · {c.status.replace(/_/g, ' ')}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Campaign name
              </span>
              <input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                placeholder='e.g. "Q3 Lending Rates Announcement"'
              />
            </label>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Media Format</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {mediaTypeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onMediaTypeChange(opt.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-bold transition',
                      mediaType === opt.id
                        ? 'border-orange-500/50 bg-orange-500/15 text-orange-500'
                        : 'border-neutral-700 text-neutral-400 hover:border-orange-500/40 hover:bg-neutral-800/60'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {mediaType === 'story' ? (
                <p className="mt-2 text-[11px] text-neutral-500">
                  Stories only need a media file — title and caption are hidden.
                </p>
              ) : null}
            </div>

            {showTitle ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Hook / headline
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                  placeholder="Short scroll-stopping hook"
                />
              </label>
            ) : null}

            <MediaUploader
              imageUrl={imageUrl}
              onImageUrlChange={(url) => {
                setImageUrl(url);
                setPreviewBroken(false);
              }}
              canvaUrl={canvaUrl}
              mediaType={mediaType}
            />

            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Or paste Canva / CDN media URL
              </span>
              <input
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setPreviewBroken(false);
                }}
                className="w-full rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                placeholder="https://…"
              />
            </label>

            {showCaption ? (
              <>
                <label className="block space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Caption
                    </span>
                    <span
                      className={cn(
                        'text-[11px] font-semibold',
                        caption.length > charSafe ? 'text-red-400' : 'text-neutral-500'
                      )}
                    >
                      {caption.length}/{charSafe}
                    </span>
                  </div>
                  <textarea
                    value={caption}
                    onChange={(e) =>
                      setCaption(e.target.value.slice(0, Math.max(charSafe, LINKEDIN_MAX)))
                    }
                    rows={8}
                    required={mediaType !== 'story'}
                    className="w-full rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                    placeholder="Write the post body…"
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
                      className="rounded-full border border-neutral-700 bg-[#0A0A0A] px-3 py-1 text-xs font-bold text-orange-500 hover:border-orange-500/40"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setLinkedin((v) => !v)}
                className={cn(
                  'rounded-xl border p-5 text-left transition',
                  linkedin
                    ? 'border-orange-500/50 bg-orange-500/10'
                    : 'border-neutral-800 bg-neutral-900/70 hover:border-orange-500/30'
                )}
              >
                <p className="text-sm font-bold text-white">LinkedIn Official Feed</p>
                <p className="mt-2 text-[11px] text-neutral-500">
                  {linkedin ? 'Selected · 3,000 char cap' : 'Tap to include'}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setInstagram((v) => !v)}
                className={cn(
                  'rounded-xl border p-5 text-left transition',
                  instagram
                    ? 'border-orange-500/50 bg-orange-500/10'
                    : 'border-neutral-800 bg-neutral-900/70 hover:border-orange-500/30'
                )}
              >
                <p className="text-sm font-bold text-white">Instagram Business Feed</p>
                <p className="mt-2 text-[11px] text-neutral-500">
                  {instagram ? 'Selected · 2,200 char cap' : 'Tap to include'}
                </p>
              </button>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-[#0A0A0A] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                Live card preview
              </p>
              {imageUrl.trim() && !previewBroken ? (
                isVideoSocialMedia(mediaType, imageUrl) ? (
                  <video
                    src={imageUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="mt-3 aspect-square w-full rounded-xl object-cover"
                    onError={() => setPreviewBroken(true)}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt=""
                    className="mt-3 aspect-square w-full rounded-xl object-cover"
                    onError={() => setPreviewBroken(true)}
                  />
                )
              ) : (
                <div className="mt-3 flex aspect-square items-center justify-center rounded-xl border border-dashed border-neutral-800 text-sm text-neutral-600">
                  Media preview
                </div>
              )}
              {showTitle || campaignName ? (
                <p className="mt-3 text-sm font-bold text-white">
                  {campaignName || title || 'Untitled'}
                </p>
              ) : null}
              {showCaption ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
                  {preview}
                </p>
              ) : (
                <p className="mt-2 text-xs uppercase tracking-wider text-neutral-500">
                  Story · media only
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={pending || !canSubmit}
                onClick={onSaveDraft}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-5 py-3 text-sm font-bold text-white hover:border-orange-500/50 disabled:opacity-50"
              >
                {pending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Save Draft
              </button>
              <button
                type="submit"
                disabled={pending || !canSubmit}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(249,115,22,0.35)] disabled:opacity-50"
              >
                {pending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                Submit for Admin Approval
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
