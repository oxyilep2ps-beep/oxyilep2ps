'use client';

import { FormEvent, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock3,
  ImagePlus,
  Loader2,
  Save,
  Share2,
  Sparkles,
} from 'lucide-react';
import { BlogQualityChecklist, evaluateBlogQuality } from '@/components/blog/blog-quality-checklist';
import { RichTextEditor } from '@/components/blog/rich-text-editor';
import {
  BLOG_CATEGORIES,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@/lib/blog/datetime';
import { slugifyBlogTitle } from '@/lib/blog/slug';
import { analyzeSeoContent } from '@/lib/seo/engine';
import { cn } from '@/lib/utils';

export type BlogStudioPayload = {
  title: string;
  content: string;
  cover_image_url: string | null;
  inline_images?: string[];
  category?: string;
  tags?: string[];
  share_linkedin?: boolean;
  share_instagram?: boolean;
  cover_image_alt?: string | null;
  social_caption?: string | null;
  auto_share_socials?: boolean;
  meta_description?: string;
  focus_keyword?: string;
  publishAt?: string | null;
};

type BlogEditorPanelProps = {
  initialTitle?: string;
  initialContent?: string;
  initialCoverUrl?: string | null;
  initialSlug?: string | null;
  initialMetaDescription?: string;
  initialFocusKeyword?: string;
  initialCategory?: string;
  initialTags?: string[];
  initialShareLinkedin?: boolean;
  initialShareInstagram?: boolean;
  initialCoverImageAlt?: string;
  initialSocialCaption?: string;
  initialAutoShareSocials?: boolean;
  initialPublishAt?: string | null;
  submitLabel?: string;
  saveDraftLabel?: string;
  showDraftButton?: boolean;
  busy?: boolean;
  adminFeedback?: string | null;
  rejectionReason?: string | null;
  onUploadCover: (file: File) => Promise<string>;
  onUploadInlineImage?: (file: File) => Promise<string>;
  onSubmit: (payload: BlogStudioPayload) => Promise<void>;
  onSaveDraft?: (payload: BlogStudioPayload) => Promise<void>;
};

function wordStats(html: string) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  return { words, minutes: Math.max(1, Math.ceil(words / 220)) };
}

export function BlogEditorPanel({
  initialTitle = '',
  initialContent = '<p></p>',
  initialCoverUrl = null,
  initialSlug = null,
  initialMetaDescription = '',
  initialFocusKeyword = '',
  initialCategory = 'FinTech',
  initialTags = [],
  initialShareLinkedin = false,
  initialShareInstagram = false,
  initialCoverImageAlt = '',
  initialSocialCaption = '',
  initialAutoShareSocials,
  initialPublishAt = null,
  submitLabel = 'Approve & Publish',
  saveDraftLabel = 'Save Draft',
  showDraftButton = true,
  busy = false,
  adminFeedback = null,
  rejectionReason = null,
  onUploadCover,
  onUploadInlineImage,
  onSubmit,
  onSaveDraft,
}: BlogEditorPanelProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [inlineImages, setInlineImages] = useState<string[]>([]);
  const [meta, setMeta] = useState(initialMetaDescription);
  const [focusKeyword, setFocusKeyword] = useState(initialFocusKeyword);
  const [category, setCategory] = useState(initialCategory || 'FinTech');
  const [tagsInput, setTagsInput] = useState(initialTags.join(', '));
  const [coverImageAlt, setCoverImageAlt] = useState(initialCoverImageAlt);
  const [socialCaption, setSocialCaption] = useState(initialSocialCaption);
  const [autoShareSocials, setAutoShareSocials] = useState(
    initialAutoShareSocials ?? true
  );
  const [publishLocal, setPublishLocal] = useState(
    toDatetimeLocalValue(initialPublishAt) || toDatetimeLocalValue(new Date().toISOString())
  );
  const [message, setMessage] = useState<string | null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const quality = evaluateBlogQuality(title, content, coverUrl);
  const isBusy = busy || localBusy;
  const stats = useMemo(() => wordStats(content), [content]);
  const slug = initialSlug || slugifyBlogTitle(title) || 'untitled';
  const analysis = useMemo(
    () =>
      analyzeSeoContent({
        title,
        metaDescription: meta,
        html: content,
        focusKeyword,
        slug,
      }),
    [content, focusKeyword, meta, slug, title]
  );

  const buildPayload = (): BlogStudioPayload => ({
    title,
    content,
    cover_image_url: coverUrl,
    inline_images: inlineImages,
    category,
    tags: tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    share_linkedin: autoShareSocials,
    share_instagram: autoShareSocials,
    cover_image_alt: coverImageAlt.trim() || null,
    social_caption: socialCaption.trim() || null,
    auto_share_socials: autoShareSocials,
    meta_description: meta,
    focus_keyword: focusKeyword,
    publishAt: fromDatetimeLocalValue(publishLocal),
  });

  const onCover = async (file: File | null) => {
    if (!file) return;
    const url = await onUploadCover(file);
    setCoverUrl(url);
  };

  const run = async (action: 'submit' | 'draft') => {
    if (action === 'submit' && !quality.allGreen) {
      setMessage('Perfect Blog checklist must be all green before submitting.');
      return;
    }
    setLocalBusy(true);
    setMessage(null);
    try {
      const payload = buildPayload();
      if (action === 'submit') await onSubmit(payload);
      else if (onSaveDraft) await onSaveDraft(payload);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLocalBusy(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run('submit');
  };

  return (
    <form onSubmit={handleSubmit} className="relative pb-28">
      {/* Sticky action header */}
      <div className="sticky top-0 z-30 -mx-1 mb-6 border-b border-neutral-800/80 bg-neutral-950/90 px-1 py-3 backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-200">
              {title.trim() || 'Untitled draft'}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
              <span className="inline-flex items-center gap-1">
                <Sparkles size={12} className="text-[#F97316]" />
                {stats.words} words
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 size={12} />~{stats.minutes} min read
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 font-bold uppercase tracking-wider',
                  analysis.contentScore >= 70
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-amber-500/15 text-amber-200'
                )}
              >
                SEO {analysis.contentScore}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {showDraftButton && onSaveDraft ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void run('draft')}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-bold text-neutral-100 disabled:opacity-50"
              >
                {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saveDraftLabel}
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isBusy || !quality.allGreen}
              className="inline-flex items-center gap-2 rounded-full bg-[#F97316] px-5 py-2 text-sm font-bold text-white shadow-[0_0_24px_rgba(249,115,22,0.35)] disabled:opacity-50"
            >
              {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {submitLabel}
            </button>
          </div>
        </div>
      </div>

      {adminFeedback || rejectionReason ? (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <div className="flex items-start gap-2 text-red-300">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider">
                Admin changes requested{rejectionReason ? ` · ${rejectionReason}` : ''}
              </p>
              <div
                className="prose prose-sm mt-2 max-w-none text-sm text-red-100 dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: adminFeedback || '<p>Please revise and resubmit.</p>',
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Section 1 — Hero metadata & canvas */}
      <section className="space-y-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title"
          className="w-full border-0 bg-transparent text-3xl font-black leading-tight text-white outline-none placeholder:text-neutral-600 sm:text-4xl"
          required
        />
        <p className="text-sm text-neutral-500">
          Permalink preview:{' '}
          <span className="font-semibold text-[#F97316]">oxyile.com/blog/{slug}</span>
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void onCover(file);
          }}
          className={cn(
            'relative overflow-hidden rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/50 transition',
            dragOver && 'border-[#F97316]/70 bg-[#F97316]/5'
          )}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="max-h-64 w-full object-cover" />
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 px-6 py-14 text-neutral-400"
            >
              <ImagePlus className="text-[#F97316]" size={28} />
              <span className="text-sm font-semibold">Drop a cover image or click to upload</span>
            </button>
          )}
          <div className="absolute bottom-3 right-3">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="rounded-full bg-neutral-950/80 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/10"
            >
              Change cover
            </button>
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onCover(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/60">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Start writing… Type / for slash commands"
            onUploadInlineImage={onUploadInlineImage}
            onInlineImagesChange={setInlineImages}
          />
        </div>
      </section>

      {/* Section 2 — SEO */}
      <section className="mt-10 space-y-4 border-t border-neutral-800 pt-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F97316]">
            Section 2 · On-page SEO
          </p>
          <h3 className="mt-1 text-xl font-black text-white">Content Engine</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">SEO score</p>
            <p className="mt-1 text-3xl font-black text-[#F97316]">{analysis.contentScore}</p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Readability</p>
            <p className="mt-1 text-3xl font-black text-white">{analysis.readabilityScore}</p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Keyword density</p>
            <p className="mt-1 text-3xl font-black text-white">{analysis.keywordDensity}%</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Meta title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Focus keyword</span>
            <input
              value={focusKeyword}
              onChange={(e) => setFocusKeyword(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
              placeholder="e.g. UK P2P lending"
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Meta description</span>
          <textarea
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
            placeholder="Compelling summary for Google results…"
          />
        </label>

        <div className="rounded-2xl border border-neutral-800 bg-white p-4 text-neutral-900">
          <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Live Google SERP preview</p>
          <p className="mt-2 truncate text-sm text-emerald-700">oxyile.com › blog › {slug}</p>
          <p className="mt-1 text-xl font-semibold text-blue-700">{title || 'Your headline appears here'}</p>
          <p className="mt-1 text-sm text-neutral-600">
            {meta || 'Meta description preview for Google results…'}
          </p>
        </div>

        <BlogQualityChecklist title={title} content={content} coverImage={coverUrl} />
      </section>

      {/* Section 3 — Publishing */}
      <section className="mt-10 space-y-4 border-t border-neutral-800 pt-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F97316]">
            Section 3 · Publishing
          </p>
          <h3 className="mt-1 text-xl font-black text-white">Syndication &amp; chronology</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
            >
              {BLOG_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Tags</span>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
              placeholder="lending, EMI, FCA"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Publish date &amp; time
          </span>
          <input
            type="datetime-local"
            value={publishLocal}
            onChange={(e) => setPublishLocal(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50 [color-scheme:dark]"
          />
          <span className="block text-[11px] text-neutral-500">
            Historical backdating is allowed. Past dates (e.g. January 2025) bind to{' '}
            <code className="text-neutral-300">created_at</code> /{' '}
            <code className="text-neutral-300">published_at</code> for correct blog ordering.
          </span>
        </label>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl sm:p-5">
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-[#F97316]" />
            <p className="text-sm font-bold text-white">Social media syndication</p>
          </div>
          <p className="text-[11px] leading-relaxed text-neutral-500">
            Bloggers only set metadata here. LinkedIn &amp; Instagram posts are sent via Make.com strictly when an
            Admin clicks Approve &amp; Publish.
          </p>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Cover image alt text
            </span>
            <input
              value={coverImageAlt}
              onChange={(e) => setCoverImageAlt(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
              placeholder="e.g., Oxyile UK P2P Lending Co-Applicant Workflow Diagram"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              LinkedIn &amp; Instagram Caption (Optional)
            </span>
            <textarea
              value={socialCaption}
              onChange={(e) => setSocialCaption(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
              placeholder="Write a catchy 2-3 sentence hook for social media... (If left blank, Meta Description will be used automatically)"
            />
          </label>

          <button
            type="button"
            onClick={() => setAutoShareSocials((v) => !v)}
            className={cn(
              'flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 text-left transition',
              autoShareSocials
                ? 'border-[#F97316]/50 bg-[#F97316]/10'
                : 'border-neutral-800 bg-neutral-950/50'
            )}
          >
            <span className="text-sm font-semibold leading-snug text-white">
              Automatically share to LinkedIn &amp; Instagram when approved by Admin
            </span>
            <span
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition',
                autoShareSocials ? 'bg-[#F97316]' : 'bg-neutral-700'
              )}
              aria-hidden
            >
              <span
                className={cn(
                  'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
                  autoShareSocials ? 'left-5' : 'left-0.5'
                )}
              />
            </span>
          </button>
        </div>
      </section>

      {message ? <p className="mt-6 text-sm font-semibold text-[#F97316]">{message}</p> : null}
    </form>
  );
}
