'use client';

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Bot,
  CheckCircle2,
  Globe2,
  ImageIcon,
  Link2,
  ListTree,
  Loader2,
  Network,
  Share2,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react';
import { RichTextEditor } from '@/components/blog/rich-text-editor';
import { AuthToast } from '@/components/auth-toast';
import {
  checkKeywordCannibalization,
  saveSeoBlogPost,
} from '@/app/actions/blogger-seo';
import {
  EXTERNAL_AUTHORITY_LINKS,
  INTERNAL_LINK_SUGGESTIONS,
  MULTILINGUAL_HINTS,
  analyzeSeoContent,
  generateSocialRepurpose,
  mockAutocomplete,
  mockLongTailAndLsi,
  scoreHeadlines,
  slugifySeo,
} from '@/lib/seo/engine';
import type { BlogPostRow } from '@/lib/seo/types';
import { cn } from '@/lib/utils';

type Props = { initialPost: BlogPostRow };

function ScorePill({ label, value }: { label: string; value: number }) {
  const tone = value >= 80 ? 'text-emerald-500' : value >= 55 ? 'text-amber-500' : 'text-red-500';
  return (
    <div className="rounded-xl border border-white/40 bg-white/50 px-3 py-2 dark:border-white/10 dark:bg-black/30">
      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={cn('text-lg font-black', tone)}>{value}</p>
    </div>
  );
}

export function BloggerSeoStudio({ initialPost }: Props) {
  const [title, setTitle] = useState(initialPost.title);
  const [slug, setSlug] = useState(initialPost.slug);
  const [meta, setMeta] = useState(initialPost.meta_description);
  const [focusKeyword, setFocusKeyword] = useState(initialPost.focus_keyword);
  const [content, setContent] = useState(initialPost.content);
  const [coverAlt, setCoverAlt] = useState(initialPost.cover_alt_text ?? '');
  const [serpMode, setSerpMode] = useState<'desktop' | 'mobile'>('desktop');
  const [headlineA, setHeadlineA] = useState(initialPost.title);
  const [headlineB, setHeadlineB] = useState('');
  const [headlineC, setHeadlineC] = useState('');
  const [social, setSocial] = useState<{ twitterThread: string[]; linkedIn: string } | null>(null);
  const [cannibals, setCannibals] = useState<BlogPostRow[]>([]);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [copilotHint, setCopilotHint] = useState('');

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

  const lsi = useMemo(() => mockLongTailAndLsi(deferredKw || deferredTitle), [deferredKw, deferredTitle]);
  const headlines = useMemo(
    () => scoreHeadlines([headlineA, headlineB, headlineC], focusKeyword),
    [focusKeyword, headlineA, headlineB, headlineC]
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !event.shiftKey) return;
      event.preventDefault();
      const addition = mockAutocomplete(content.replace(/<[^>]+>/g, ' ').slice(-120), focusKeyword);
      setContent((prev) => `${prev}<p>${addition}</p>`);
      setCopilotHint('AI autocomplete inserted (Shift+Tab).');
      window.setTimeout(() => setCopilotHint(''), 2500);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [content, focusKeyword]);

  const save = () => {
    startTransition(async () => {
      const result = await saveSeoBlogPost({
        id: initialPost.id,
        title,
        slug: slug || slugifySeo(title),
        content,
        metaDescription: meta,
        focusKeyword,
        coverAltText: coverAlt,
        contentType: analysis.contentType,
        status: 'draft',
      });
      if (!result.ok) {
        setToast({ tone: 'error', message: result.error });
        return;
      }
      setToast({ tone: 'success', message: `Saved · SEO score ${result.metrics.content_score}` });
    });
  };

  const insertLsi = (term: string) => {
    setContent((prev) => `${prev}<p>Naturally weave in <strong>${term}</strong> where it strengthens topical coverage.</p>`);
  };

  const insertInternal = (href: string, label: string) => {
    setContent((prev) => `${prev}<p>See also: <a href="${href}">${label}</a>.</p>`);
  };

  return (
    <div className="space-y-4">
      <AuthToast
        open={Boolean(toast)}
        tone={toast?.tone ?? 'error'}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/blogger/seo" className="text-sm font-semibold text-brand-600">
          ← SEO Hub
        </Link>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:bg-black/30">
            {analysis.contentType} page
          </span>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {pending ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
            Save draft + scores
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="glass-card space-y-3 rounded-2xl p-5">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Title</span>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slug || slug.startsWith(slugifySeo(initialPost.title))) {
                    setSlug(slugifySeo(e.target.value));
                  }
                }}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-lg font-black dark:border-white/10 dark:bg-black/40"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Slug</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Focus keyword</span>
                <input
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Meta description</span>
              <textarea
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
              />
            </label>
            {cannibals.length > 0 ? (
              <div className="rounded-xl border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                ⚠ Cannibalization warning: {cannibals.length} other draft(s) already target “{focusKeyword}”.
              </div>
            ) : null}
          </div>

          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/40 px-4 py-2 text-xs dark:border-white/10">
              <span className="font-bold uppercase tracking-wider text-brand-500">Rich editor</span>
              <span className="text-neutral-500">
                {copilotHint || 'Shift+Tab = AI autocomplete'} · {analysis.wordCount} words · ~
                {analysis.readTimeMinutes} min read
              </span>
            </div>
            <RichTextEditor value={content} onChange={setContent} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass-card rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-brand-500">SERP preview</p>
                <div className="flex gap-1">
                  {(['desktop', 'mobile'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSerpMode(mode)}
                      className={cn(
                        'rounded-full px-3 py-1 text-[10px] font-bold uppercase',
                        serpMode === mode ? 'bg-brand-500 text-white' : 'bg-white/40 dark:bg-black/30'
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className={cn(
                  'rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-950',
                  serpMode === 'mobile' && 'mx-auto max-w-[320px]'
                )}
              >
                <p className="truncate text-sm text-emerald-700">{`oxyile.com › blog › ${slug || 'post'}`}</p>
                <p className="mt-1 text-xl font-semibold text-blue-700 dark:text-blue-400">
                  {title || 'Your headline appears here'}
                </p>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  {meta || 'Meta description preview for Google results…'}
                </p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4">
              <div className="mb-2 flex items-center gap-2 text-brand-500">
                <ListTree size={16} />
                <p className="text-xs font-black uppercase tracking-wider">Sticky table of contents</p>
              </div>
              {analysis.headings.length === 0 ? (
                <p className="text-sm text-neutral-500">Add H2/H3 headings to auto-build TOC.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {analysis.headings.map((h, idx) => (
                    <li key={`${h.text}-${idx}`} style={{ paddingLeft: (h.level - 1) * 12 }} className="text-neutral-700 dark:text-neutral-300">
                      H{h.level}: {h.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass-card rounded-2xl p-4">
              <div className="mb-2 flex items-center gap-2 text-brand-500">
                <Target size={16} />
                <p className="text-xs font-black uppercase tracking-wider">A/B headline tester</p>
              </div>
              <div className="space-y-2">
                <input value={headlineA} onChange={(e) => setHeadlineA(e.target.value)} placeholder="Variant A" className="w-full rounded-lg border px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40" />
                <input value={headlineB} onChange={(e) => setHeadlineB(e.target.value)} placeholder="Variant B" className="w-full rounded-lg border px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40" />
                <input value={headlineC} onChange={(e) => setHeadlineC(e.target.value)} placeholder="Variant C" className="w-full rounded-lg border px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40" />
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {headlines.map((h) => (
                  <li key={h.title} className="rounded-lg bg-white/50 px-3 py-2 dark:bg-black/30">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">{h.title}</span>
                      <span className="font-black text-brand-600">{h.predictedCtr}</span>
                    </div>
                    <p className="text-[11px] text-neutral-500">{h.notes}</p>
                    <button type="button" className="mt-1 text-[11px] font-bold text-brand-600" onClick={() => setTitle(h.title)}>
                      Use this title
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card rounded-2xl p-4">
              <div className="mb-2 flex items-center gap-2 text-brand-500">
                <Share2 size={16} />
                <p className="text-xs font-black uppercase tracking-wider">Social repurposing</p>
              </div>
              <button
                type="button"
                className="rounded-full bg-brand-500/15 px-3 py-1.5 text-xs font-bold text-brand-600"
                onClick={() =>
                  setSocial(
                    generateSocialRepurpose(
                      title,
                      content.replace(/<[^>]+>/g, ' ')
                    )
                  )
                }
              >
                One-click Twitter + LinkedIn
              </button>
              {social ? (
                <div className="mt-3 space-y-3 text-xs">
                  <div>
                    <p className="font-bold text-neutral-500">X / Twitter thread</p>
                    <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-black/80 p-3 text-neutral-100">
                      {social.twitterThread.join('\n\n')}
                    </pre>
                  </div>
                  <div>
                    <p className="font-bold text-neutral-500">LinkedIn</p>
                    <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-black/80 p-3 text-neutral-100">
                      {social.linkedIn}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs font-black uppercase tracking-wider text-brand-500">Live SEO scores</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ScorePill label="Content" value={analysis.contentScore} />
              <ScorePill label="Readability" value={analysis.readabilityScore} />
              <ScorePill label="Voice search" value={analysis.voiceSearchScore} />
              <ScorePill label="Trust / human" value={analysis.trustScore} />
              <ScorePill label="Predicted CTR" value={analysis.predictedCtr} />
              <ScorePill label="Links" value={analysis.linkScore} />
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              Keyword density {analysis.keywordDensity}% · Engagement predictor: ~
              {Math.min(95, 40 + analysis.headingScore * 0.3 + Math.min(analysis.wordCount / 20, 30)).toFixed(0)}%
              scroll depth
            </p>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-brand-500">On-page checklist</p>
            <ul className="space-y-2">
              {analysis.checklist.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-xs">
                  <span className={item.passed ? 'text-emerald-500' : 'text-red-400'}>
                    {item.passed ? '✓' : '○'}
                  </span>
                  <span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{item.label}</span>
                    <span className="block text-neutral-500">{item.hint}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2 text-brand-500">
              <Wand2 size={14} />
              <p className="text-xs font-black uppercase tracking-wider">Readability scorer</p>
            </div>
            {analysis.readabilityIssues.length === 0 ? (
              <p className="text-xs text-emerald-600">Looking clean — few complex/passive/jargon flags.</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
                {analysis.readabilityIssues.map((issue, idx) => (
                  <li key={`${issue.type}-${idx}`} className="rounded-lg bg-white/40 p-2 dark:bg-black/30">
                    <p className="font-bold uppercase text-amber-600">{issue.type}</p>
                    <p className="text-neutral-600 dark:text-neutral-300">{issue.sentence}</p>
                    <p className="text-brand-600">{issue.suggestion}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2 text-brand-500">
              <Sparkles size={14} />
              <p className="text-xs font-black uppercase tracking-wider">LSI injector</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {lsi.lsi.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => insertLsi(term)}
                  className="rounded-full border border-brand-300/40 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:text-brand-300"
                >
                  + {term}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-500">Long-tails</p>
            <ul className="mt-1 space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
              {lsi.longTail.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2 text-brand-500">
              <Bot size={14} />
              <p className="text-xs font-black uppercase tracking-wider">Snippet + voice</p>
            </div>
            <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
              {analysis.snippetCandidates.length === 0 ? (
                <li>Add a short definition paragraph or list for Position Zero.</li>
              ) : (
                analysis.snippetCandidates.map((c) => <li key={c}>• {c}</li>)
              )}
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2 text-brand-500">
              <Link2 size={14} />
              <p className="text-xs font-black uppercase tracking-wider">Link suggestions</p>
            </div>
            <p className="text-[11px] font-bold text-neutral-500">Internal</p>
            <ul className="mt-1 space-y-1">
              {INTERNAL_LINK_SUGGESTIONS.map((l) => (
                <li key={l.href}>
                  <button type="button" className="text-xs font-semibold text-brand-600" onClick={() => insertInternal(l.href, l.label)}>
                    {l.label}
                  </button>
                  <span className="ml-1 text-[10px] text-neutral-500">{l.reason}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] font-bold text-neutral-500">External authority</p>
            <ul className="mt-1 space-y-1">
              {EXTERNAL_AUTHORITY_LINKS.map((l) => (
                <li key={l.href}>
                  <button type="button" className="text-xs font-semibold text-brand-600" onClick={() => insertInternal(l.href, l.label)}>
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2 text-brand-500">
              <ImageIcon size={14} />
              <p className="text-xs font-black uppercase tracking-wider">Image alt AI</p>
            </div>
            <button
              type="button"
              className="rounded-full bg-brand-500/15 px-3 py-1.5 text-xs font-bold text-brand-600"
              onClick={() =>
                setCoverAlt(
                  `${title || 'FinTech article'} — illustrating ${focusKeyword || 'UK peer-to-peer lending'} for Oxyile readers`
                )
              }
            >
              Generate SEO alt text
            </button>
            <input
              value={coverAlt}
              onChange={(e) => setCoverAlt(e.target.value)}
              className="mt-2 w-full rounded-lg border px-3 py-2 text-xs dark:border-white/10 dark:bg-black/40"
              placeholder="Cover image alt text"
            />
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2 text-brand-500">
              <Globe2 size={14} />
              <p className="text-xs font-black uppercase tracking-wider">Multilingual SEO</p>
            </div>
            <ul className="space-y-2 text-xs">
              {MULTILINGUAL_HINTS.map((m) => (
                <li key={m.region} className="rounded-lg bg-white/40 p-2 dark:bg-black/30">
                  <p className="font-semibold">
                    {m.region} · {m.language}
                  </p>
                  <p className="text-neutral-500">{m.opportunity}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2 text-brand-500">
              <Network size={14} />
              <p className="text-xs font-black uppercase tracking-wider">Internal link graph</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-brand-500 px-3 py-1 text-[11px] font-bold text-white">
                {title.slice(0, 18) || 'This draft'}
              </span>
              {analysis.internalLinks.slice(0, 6).map((href) => (
                <span key={href} className="rounded-full border border-white/40 px-3 py-1 text-[11px] dark:border-white/10">
                  {href}
                </span>
              ))}
              {analysis.internalLinks.length === 0 ? (
                <p className="text-xs text-neutral-500">Add internal links to visualise the graph.</p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
