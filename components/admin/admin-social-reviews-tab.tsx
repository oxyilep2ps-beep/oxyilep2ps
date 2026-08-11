'use client';

import { FormEvent, useCallback, useEffect, useState, useTransition } from 'react';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import {
  approveSocialCampaign,
  listPendingSocialCampaigns,
  rejectSocialCampaign,
  updatePendingSocialCampaign,
} from '@/app/actions/social-campaigns';
import { AdminMarkNotificationsRead } from '@/components/admin/admin-mark-notifications-read';
import { AuthToast } from '@/components/auth-toast';
import { SocialMediaPreview } from '@/components/social/social-media-preview';
import {
  mediaTypeBadgeClass,
  mediaTypeLabel,
  normalizeSocialMediaType,
} from '@/lib/social/media';
import type { SocialCampaignRow, SocialMediaType } from '@/lib/social/types';
import { cn } from '@/lib/utils';

type DraftMap = Record<
  string,
  {
    campaignName: string;
    title: string;
    caption: string;
    imageUrl: string;
    mediaType: SocialMediaType;
    linkedin: boolean;
    instagram: boolean;
  }
>;

export function AdminSocialReviewsTab() {
  const [rows, setRows] = useState<SocialCampaignRow[]>([]);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pendingRows = await listPendingSocialCampaigns();
      setRows(pendingRows);
      const next: DraftMap = {};
      for (const row of pendingRows) {
        const mediaType = normalizeSocialMediaType(row.media_type);
        next[row.id] = {
          campaignName: row.campaign_name,
          title: row.title,
          caption: row.caption,
          imageUrl: row.image_url,
          mediaType,
          linkedin: Boolean(row.channels.linkedin),
          instagram: Boolean(row.channels.instagram),
        };
      }
      setDrafts(next);
    } catch (e) {
      setToast({
        tone: 'error',
        message: e instanceof Error ? e.message : 'Failed to load pending social campaigns',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchDraft = (id: string, patch: Partial<DraftMap[string]>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const buildUpdates = (d: DraftMap[string]) => {
    const isStory = d.mediaType === 'story';
    const showTitle = d.mediaType === 'post';
    const showCaption = d.mediaType === 'post' || d.mediaType === 'reel';
    return {
      campaignName: d.campaignName,
      title: isStory || !showTitle ? '' : d.title,
      caption: isStory || !showCaption ? '' : d.caption,
      imageUrl: d.imageUrl,
      mediaType: d.mediaType,
      channels: { linkedin: d.linkedin, instagram: d.instagram },
    };
  };

  const onSaveInline = (id: string) => {
    const d = drafts[id];
    if (!d) return;
    startTransition(async () => {
      const result = await updatePendingSocialCampaign(id, buildUpdates(d));
      if (!result.ok) {
        setToast({ tone: 'error', message: result.error });
        return;
      }
      setToast({ tone: 'success', message: 'Inline edits saved.' });
    });
  };

  const onApprove = (id: string) => {
    const d = drafts[id];
    if (!d) return;
    startTransition(async () => {
      const result = await approveSocialCampaign(id, buildUpdates(d));
      if (!result.ok) {
        setToast({ tone: 'error', message: result.error });
        return;
      }
      if (!result.webhookOk) {
        setToast({
          tone: 'error',
          message: `⚠️ Saved to DB, but failed to reach Webhook: ${result.webhookError}`,
        });
        await load();
        return;
      }
      setToast({
        tone: 'success',
        message: '🚀 Post approved & sent to Make.com Webhook successfully!',
      });
      await load();
    });
  };

  const onReject = (e: FormEvent) => {
    e.preventDefault();
    if (!rejectId) return;
    startTransition(async () => {
      const result = await rejectSocialCampaign(rejectId, rejectReason);
      if (!result.ok) {
        setToast({ tone: 'error', message: result.error });
        return;
      }
      setRejectId(null);
      setRejectReason('');
      setToast({ tone: 'success', message: 'Campaign rejected. Social Manager can revise and re-submit.' });
      await load();
    });
  };

  return (
    <div className="space-y-6">
      <AdminMarkNotificationsRead entityType="social_post" />
      <AuthToast
        open={Boolean(toast)}
        tone={toast?.tone ?? 'error'}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

      <header className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-5 shadow-2xl shadow-orange-500/5 backdrop-blur-md">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-500">
            Social Reviews
          </p>
          <h1 className="mt-1 text-2xl font-black text-white">Pending social campaigns</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Inline-edit caption, media, and channels — then Approve & Publish (Make.com) or Reject.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || pending}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-4 py-2 text-xs font-bold text-neutral-200 transition hover:border-orange-500/50 hover:bg-neutral-800/60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-neutral-900/60" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800/60 bg-[#0A0A0A] px-6 py-16 text-center text-neutral-400 shadow-2xl shadow-black/40">
          <p className="text-sm font-semibold text-neutral-400">No posts awaiting approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const d = drafts[row.id];
            if (!d) return null;
            const mediaType = d.mediaType;
            const showTitle = mediaType === 'post';
            const showCaption = mediaType === 'post' || mediaType === 'reel';

            return (
              <article
                key={row.id}
                className="rounded-2xl border border-neutral-800/80 bg-neutral-900/70 p-4 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-5"
              >
                <div className="grid gap-4 lg:grid-cols-[11rem_1fr]">
                  <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black/40">
                    <SocialMediaPreview url={d.imageUrl} mediaType={mediaType} mode="admin" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="block min-w-0 flex-1 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Campaign name
                        </span>
                        <input
                          value={d.campaignName}
                          onChange={(e) => patchDraft(row.id, { campaignName: e.target.value })}
                          className="w-full rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                        />
                      </label>
                      <span
                        className={cn(
                          'mt-5 shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                          mediaTypeBadgeClass(mediaType)
                        )}
                      >
                        {mediaTypeLabel(mediaType)}
                      </span>
                    </div>

                    {showTitle ? (
                      <label className="block space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Hook
                        </span>
                        <input
                          value={d.title}
                          onChange={(e) => patchDraft(row.id, { title: e.target.value })}
                          className="w-full rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                        />
                      </label>
                    ) : null}

                    {showCaption ? (
                      <label className="block space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Caption (inline edit)
                        </span>
                        <textarea
                          value={d.caption}
                          onChange={(e) => patchDraft(row.id, { caption: e.target.value })}
                          rows={5}
                          className="w-full rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                        />
                      </label>
                    ) : (
                      <p className="rounded-xl border border-neutral-800/80 bg-neutral-950/40 px-3 py-2 text-xs text-neutral-500">
                        Story · media only (no title or caption)
                      </p>
                    )}

                    <label className="block space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Media URL
                      </span>
                      <input
                        value={d.imageUrl}
                        onChange={(e) => patchDraft(row.id, { imageUrl: e.target.value })}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => patchDraft(row.id, { linkedin: !d.linkedin })}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-bold transition',
                          d.linkedin
                            ? 'bg-orange-500/15 text-orange-500 ring-1 ring-orange-500/40'
                            : 'bg-neutral-900 text-neutral-500 ring-1 ring-neutral-800 hover:bg-neutral-800/60'
                        )}
                      >
                        LinkedIn
                      </button>
                      <button
                        type="button"
                        onClick={() => patchDraft(row.id, { instagram: !d.instagram })}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-bold transition',
                          d.instagram
                            ? 'bg-orange-500/15 text-orange-500 ring-1 ring-orange-500/40'
                            : 'bg-neutral-900 text-neutral-500 ring-1 ring-neutral-800 hover:bg-neutral-800/60'
                        )}
                      >
                        Instagram
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onSaveInline(row.id)}
                        className="rounded-full border border-neutral-700 px-4 py-2 text-xs font-bold text-white transition hover:border-orange-500/50 hover:bg-neutral-800/60"
                      >
                        Save edits
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onApprove(row.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)]"
                      >
                        {pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Approve & Publish
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setRejectId(row.id);
                          setRejectReason('');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {rejectId ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <form
            onSubmit={onReject}
            className="w-full max-w-lg rounded-2xl border border-neutral-800/80 bg-[#0A0A0A]/95 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">
              Reject social campaign
            </p>
            <h3 className="mt-1 text-lg font-black text-white">
              {drafts[rejectId]?.campaignName || 'Campaign'}
            </h3>
            <label className="mt-4 block space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Rejection reason
              </span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={5}
                required
                placeholder="Explain what the Social Manager must fix before re-submitting…"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-red-400/40"
              />
            </label>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || !rejectReason.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm reject
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
