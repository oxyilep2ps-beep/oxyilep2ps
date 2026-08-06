'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock3,
  ImagePlus,
  Linkedin,
  Loader2,
  Save,
  Sparkles,
} from 'lucide-react';
import { RichTextEditor } from '@/components/blog/rich-text-editor';
import { AuthToast } from '@/components/auth-toast';
import { SeoAdvancedToolsPanel } from '@/components/blogger/seo-advanced-tools-panel';
import { uploadBloggerBlogCover, uploadBloggerInlineImage } from '@/app/actions/blogger-blogs';
import { checkKeywordCannibalization, saveSeoBlogPost } from '@/app/actions/blogger-seo';
import {
  BLOG_CATEGORIES,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@/lib/blog/datetime';
import { analyzeSeoContent, slugifySeo } from '@/lib/seo/engine';
import type { BlogPostRow } from '@/lib/seo/types';
import { cn } from '@/lib/utils';

type Props = { initialPost: BlogPostRow };

function ScorePill({ label, value }: { label: string; value: number }) {
  const tone = value >= 80 ? 'text-emerald-400' : value >= 55 ? 'text-amber-300' : 'text-red-400';
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={cn('mt-1 text-2xl font-black', tone)}>{value}</p>
    </div>
  );
}

export function BloggerSeoStudio({ initialPost }: Props) {
  const [title, setTitle] = useState(initialPost.title);
  const [slug, setSlug] = useState(initialPost.slug);
  const [meta, setMeta] = useState(initialPost.meta_description);
  const [focusKeyword, setFocusKeyword] = useState(initialPost.focus_keyword);
  const [content, setContent] = useState(initialPost.content);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialPost.cover_image_url);
  const [coverAlt, setCoverAlt] = useState(
    initialPost.cover_image_alt ?? initialPost.cover_alt_text ?? ''
  );
  const [socialCaption, setSocialCaption] = useState(initialPost.social_caption ?? '');
  const [shareLinkedin, setShareLinkedin] = useState(() => {
    if (initialPost.share_linkedin || initialPost.share_instagram) {
      return Boolean(initialPost.share_linkedin);
    }
    return initialPost.auto_share_socials ?? true;
  });
  const [shareInstagram, setShareInstagram] = useState(() => {
    if (initialPost.share_linkedin || initialPost.share_instagram) {
      return Boolean(initialPost.share_instagram);
    }
    return initialPost.auto_share_socials ?? true;
  });
  const [category, setCategory] = useState(initialPost.category || 'FinTech');
  const [tagsInput, setTagsInput] = useState((initialPost.tags ?? []).join(', '));
  const [publishLocal, setPublishLocal] = useState(
    toDatetimeLocalValue(initialPost.published_at || initialPost.created_at) ||
      toDatetimeLocalValue(new Date().toISOString())
  );
  const [serpMode, setSerpMode] = useState<'desktop' | 'mobile'>('desktop');
  const [cannibals, setCannibals] = useState<BlogPostRow[]>([]);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const deferredContent = useDeferredValue(content);
  const deferredTitle = useDeferredValue(title);
  const deferredMeta = useDeferredValue(meta);
  const deferredKw = useDeferredValue(focusKeyword);

  const analysis = useMemo(
    () =>
      analyzeSeoContent({
        title: deferredTitle,
        metaDescription: deferredMeta,
        html: deferredContent,
        focusKeyword: deferredKw,
        slug,
      }),
    [deferredContent, deferredKw, deferredMeta, deferredTitle, slug]
  );

  useEffect(() => {
    const kw = focusKeyword.trim();
    if (!kw) {
      setCannibals([]);
      return;
    }
    const t = window.setTimeout(() => {
      void checkKeywordCannibalization(kw, initialPost.id)
        .then(setCannibals)
        .catch(() => setCannibals([]));
    }, 500);
    return () => window.clearTimeout(t);
  }, [focusKeyword, initialPost.id]);

  const uploadCover = async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    const url = await uploadBloggerBlogCover(fd);
    setCoverUrl(url);
  };

  const uploadInline = async (file: File) => {
    const fd = new FormData();
    fd.set('file', file);
    return uploadBloggerInlineImage(fd);
  };

  const persist = (status: BlogPostRow['status']) => {
    startTransition(async () => {
      const result = await saveSeoBlogPost({
        id: initialPost.id,
        title,
        slug: slug || slugifySeo(title),
        content,
        metaDescription: meta,
        focusKeyword,
        coverImageUrl: coverUrl,
        coverAltText: coverAlt,
        coverImageAlt: coverAlt,
        socialCaption,
        autoShareSocials: shareLinkedin || shareInstagram,
        contentType: analysis.contentType,
        status,
        category,
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        shareLinkedin,
        shareInstagram,
        publishAt: fromDatetimeLocalValue(publishLocal),
      });
      if (!result.ok) {
        setToast({ tone: 'error', message: result.error });
        return;
      }
      setToast({
        tone: 'success',
        message:
          status === 'draft'
            ? `Draft saved · SEO ${result.metrics.content_score}`
            : `Submitted · SEO ${result.metrics.content_score}`,
      });
    });
  };

  return (
    <div className="relative mx-auto max-w-3xl pb-28">
      <AuthToast
        open={Boolean(toast)}
        tone={toast?.tone ?? 'error'}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

      {/* Sticky header */}
      <div className="sticky top-0 z-30 -mx-1 mb-6 border-b border-neutral-800/80 bg-neutral-950/90 px-1 py-3 backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link href="/blogger/seo" className="text-[11px] font-semibold text-neutral-500 hover:text-[#F97316]">
              ← SEO Hub
            </Link>
            <p className="mt-1 truncate text-sm font-semibold text-neutral-100">
              {title.trim() || 'Untitled SEO draft'}
            </p>
            <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500">
              <span className="inline-flex items-center gap-1">
                <Sparkles size={12} className="text-[#F97316]" />
                {analysis.wordCount} words
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 size={12} />~{analysis.readTimeMinutes} min read
              </span>
              <span className="rounded-full bg-[#F97316]/15 px-2 py-0.5 font-bold uppercase tracking-wider text-[#F97316]">
                SEO {analysis.contentScore}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => persist('draft')}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {pending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => persist('review')}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-[#F97316] px-5 py-2 text-sm font-bold text-white shadow-[0_0_24px_rgba(249,115,22,0.35)] disabled:opacity-60"
            >
              {pending ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
              Approve &amp; Publish
            </button>
          </div>
        </div>
      </div>

      {/* Section 1 */}
      <section className="space-y-5">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slug || slug.startsWith(slugifySeo(initialPost.title))) {
              setSlug(slugifySeo(e.target.value));
            }
          }}
          placeholder="Untitled"
          className="w-full border-0 bg-transparent text-3xl font-black leading-tight text-white outline-none placeholder:text-neutral-600 sm:text-5xl"
        />
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          <span>oxyile.com/blog/</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="min-w-[12rem] flex-1 rounded-lg border border-neutral-800 bg-neutral-900/70 px-2 py-1 text-sm font-semibold text-[#F97316] outline-none focus:border-[#F97316]/40"
          />
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void uploadCover(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            'relative overflow-hidden rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/50',
            dragOver && 'border-[#F97316]/70 bg-[#F97316]/5'
          )}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={coverAlt || ''} className="max-h-72 w-full object-cover" />
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 px-6 py-16 text-neutral-400"
            >
              <ImagePlus className="text-[#F97316]" size={30} />
              <span className="text-sm font-semibold">Drop cover image or click to upload</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-3 right-3 rounded-full bg-neutral-950/80 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/10"
          >
            Change cover
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void uploadCover(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/70">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Write without distraction… Type / for commands · Shift+Tab for AI autocomplete"
            onUploadInlineImage={uploadInline}
          />
        </div>
      </section>

      {/* Section 2 */}
      <section className="mt-12 space-y-5 border-t border-neutral-800 pt-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F97316]">
            Section 2 · On-page SEO content engine
          </p>
          <h2 className="mt-1 text-2xl font-black text-white">Score, meta &amp; SERP</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ScorePill label="Content" value={analysis.contentScore} />
          <ScorePill label="Readability" value={analysis.readabilityScore} />
          <ScorePill label="Predicted CTR" value={analysis.predictedCtr} />
          <ScorePill label="Voice search" value={analysis.voiceSearchScore} />
          <ScorePill label="Trust" value={analysis.trustScore} />
          <ScorePill label="Links" value={analysis.linkScore} />
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Focus keyword</span>
          <input
            value={focusKeyword}
            onChange={(e) => setFocusKeyword(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
          />
        </label>
        {cannibals.length > 0 ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Cannibalization warning: {cannibals.length} other draft(s) already target “{focusKeyword}”.
          </div>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Meta title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Meta description</span>
          <textarea
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
          />
        </label>

        <div className="rounded-2xl border border-neutral-800 bg-white p-4 text-neutral-900">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              Live Google SERP preview
            </p>
            <div className="flex gap-1">
              {(['desktop', 'mobile'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSerpMode(mode)}
                  className={cn(
                    'rounded-full px-3 py-1 text-[10px] font-bold uppercase',
                    serpMode === mode ? 'bg-[#F97316] text-white' : 'bg-neutral-100 text-neutral-600'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className={cn(serpMode === 'mobile' && 'mx-auto max-w-[320px]')}>
            <p className="truncate text-sm text-emerald-700">{`oxyile.com › blog › ${slug || 'post'}`}</p>
            <p className="mt-1 text-xl font-semibold text-blue-700">
              {title || 'Your headline appears here'}
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              {meta || 'Meta description preview for Google results…'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-[#F97316]">On-page checklist</p>
          <ul className="space-y-2">
            {analysis.checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-xs text-neutral-300">
                <span className={item.passed ? 'text-emerald-400' : 'text-red-400'}>
                  {item.passed ? '✓' : '○'}
                </span>
                <span>
                  <span className="font-semibold text-white">{item.label}</span>
                  <span className="block text-neutral-500">{item.hint}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Section 3 */}
      <section className="mt-12 space-y-5 border-t border-neutral-800 pt-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F97316]">
            Section 3 · Publishing &amp; social syndication
          </p>
          <h2 className="mt-1 text-2xl font-black text-white">Category, date &amp; auto-share</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark] focus:border-[#F97316]/50"
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
              placeholder="P2P, EMI, FCA"
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
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2.5 text-sm text-white outline-none [color-scheme:dark] focus:border-[#F97316]/50"
          />
          <span className="block text-[11px] text-neutral-500">
            Select any historical date freely. The chosen timestamp writes to{' '}
            <code className="text-neutral-300">published_at</code> and{' '}
            <code className="text-neutral-300">created_at</code> so public ordering respects backdated posts.
          </span>
        </label>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Cover image alt text
            </span>
            <input
              value={coverAlt}
              onChange={(e) => setCoverAlt(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
              placeholder="e.g., Oxyile UK P2P Lending Co-Applicant Workflow Diagram"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Social caption (Optional)
            </span>
            <textarea
              value={socialCaption}
              onChange={(e) => setSocialCaption(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-[#F97316]/50"
              placeholder="Write a catchy 2-3 sentence hook for social media... (If left blank, Meta Description will be used automatically)"
            />
          </label>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A66C2]/20 text-[#0A66C2]">
                    <Linkedin size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">LinkedIn Official Page Syndication</p>
                    <span
                      className={cn(
                        'mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        shareLinkedin
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-neutral-800 text-neutral-400'
                      )}
                    >
                      {shareLinkedin ? 'Ready for Webhook' : 'Not Connected'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={shareLinkedin}
                  onClick={() => setShareLinkedin((v) => !v)}
                  className={cn(
                    'relative h-7 w-12 shrink-0 rounded-full transition',
                    shareLinkedin ? 'bg-[#0A66C2]' : 'bg-neutral-700'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
                      shareLinkedin ? 'left-5' : 'left-0.5'
                    )}
                  />
                </button>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
                Automatically publishes article title, cover image, and canonical URL to Oxyile&apos;s LinkedIn
                feed upon Admin approval.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
                      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">Instagram Feed &amp; Visual Syndication</p>
                    <span
                      className={cn(
                        'mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        shareInstagram
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-neutral-800 text-neutral-400'
                      )}
                    >
                      {shareInstagram ? 'Ready for Webhook' : 'Not Connected'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={shareInstagram}
                  onClick={() => setShareInstagram((v) => !v)}
                  className={cn(
                    'relative h-7 w-12 shrink-0 rounded-full transition',
                    shareInstagram ? 'bg-[#F97316]' : 'bg-neutral-700'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
                      shareInstagram ? 'left-5' : 'left-0.5'
                    )}
                  />
                </button>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
                Publishes 1:1 cover visual and formatted caption to Oxyile&apos;s Instagram Business account upon
                Admin approval.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Optional advanced tools — still on the same scroll page */}
      <section className="mt-12 space-y-4 border-t border-neutral-800 pt-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F97316]">
            Advanced SEO toolkit
          </p>
          <h2 className="mt-1 text-xl font-black text-white">Same page · deeper controls</h2>
        </div>
        <SeoAdvancedToolsPanel
          title={title}
          contentHtml={content}
          focusKeyword={focusKeyword}
          internalLinkCount={analysis.internalLinks.length}
          contentScore={analysis.contentScore}
          onApplyTitle={setTitle}
          onApplyMeta={setMeta}
          onApplyContent={setContent}
        />
      </section>
    </div>
  );
}
