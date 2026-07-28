'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Flame,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  createSeoBlogPost,
  deleteSeoBlogPost,
  listDecayingSeoPosts,
  listKeywordResearch,
  listSeoBlogPosts,
  researchKeyword,
  runCompetitorAnalysis,
} from '@/app/actions/blogger-seo';
import { getTrendingFintechTopics } from '@/lib/seo/engine';
import type { BlogPostRow, CompetitorAnalysisRow, KeywordResearchRow } from '@/lib/seo/types';
import { AuthToast } from '@/components/auth-toast';
import { cn } from '@/lib/utils';

type HubTab = 'overview' | 'keywords' | 'topics' | 'competitors' | 'decay';

export function BloggerSeoHub() {
  const [tab, setTab] = useState<HubTab>('overview');
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [keywords, setKeywords] = useState<KeywordResearchRow[]>([]);
  const [decay, setDecay] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [keywordInput, setKeywordInput] = useState('peer to peer lending uk');
  const [competitorKeyword, setCompetitorKeyword] = useState('gocardless direct debit');
  const [competitorResult, setCompetitorResult] = useState<CompetitorAnalysisRow | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const topics = useMemo(() => getTrendingFintechTopics(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, k, d] = await Promise.all([
        listSeoBlogPosts(),
        listKeywordResearch(),
        listDecayingSeoPosts(),
      ]);
      setPosts(p);
      setKeywords(k);
      setDecay(d);
    } catch (err) {
      setToast({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Could not load SEO module. Apply the new migration if tables are missing.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createDraft = async (title?: string, focusKeyword?: string) => {
    setBusy(true);
    const result = await createSeoBlogPost({ title, focusKeyword });
    setBusy(false);
    if (!result.ok) {
      setToast({ tone: 'error', message: result.error });
      return;
    }
    setToast({ tone: 'success', message: 'SEO draft created.' });
    window.location.href = `/blogger/seo/${result.post.id}`;
  };

  const onResearch = async () => {
    setBusy(true);
    const result = await researchKeyword(keywordInput);
    setBusy(false);
    if (!result.ok) {
      setToast({ tone: 'error', message: result.error });
      return;
    }
    setToast({ tone: 'success', message: `Researched “${result.row.keyword}”` });
    await load();
    setTab('keywords');
  };

  const onCompetitor = async () => {
    setBusy(true);
    const result = await runCompetitorAnalysis({ keyword: competitorKeyword });
    setBusy(false);
    if (!result.ok) {
      setToast({ tone: 'error', message: result.error });
      return;
    }
    setCompetitorResult(result.row);
    setToast({ tone: 'success', message: 'Competitor gaps ready.' });
    setTab('competitors');
  };

  const tabs: { id: HubTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'keywords', label: 'Keyword Hub' },
    { id: 'topics', label: 'Topic Engine' },
    { id: 'competitors', label: 'Competitors' },
    { id: 'decay', label: 'Decay Alerts' },
  ];

  return (
    <div className="space-y-6">
      <AuthToast
        open={Boolean(toast)}
        tone={toast?.tone ?? 'error'}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

      <div className="glass-card rounded-[1.75rem] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">SEO Content Engine</p>
            <h2 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">
              Blogger & Newsletter SEO Guide
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
              Keyword research, competitor gaps, live on-page scoring, readability, SERP preview, and 15+
              advanced FinTech writing tools — built for Oxyile editors.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createDraft()}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-glow hover:bg-brand-400 disabled:opacity-60"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            New SEO draft
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                tab === item.id
                  ? 'bg-brand-500 text-white'
                  : 'border border-white/50 bg-white/40 text-neutral-700 dark:border-white/10 dark:bg-black/30 dark:text-neutral-200'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card animate-pulse rounded-2xl p-5">
              <div className="h-4 w-1/2 rounded bg-neutral-300/60 dark:bg-white/10" />
              <div className="mt-4 h-3 w-full rounded bg-neutral-200/60 dark:bg-white/5" />
              <div className="mt-2 h-3 w-2/3 rounded bg-neutral-200/60 dark:bg-white/5" />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && tab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass-card rounded-2xl p-5 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2 text-brand-500">
              <Sparkles size={18} />
              <h3 className="text-sm font-black uppercase tracking-wider">Your SEO drafts</h3>
            </div>
            {posts.length === 0 ? (
              <p className="text-sm text-neutral-500">No drafts yet. Create one to open the live SEO editor.</p>
            ) : (
              <ul className="space-y-3">
                {posts.map((post) => (
                  <li
                    key={post.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/40 bg-white/50 px-4 py-3 dark:border-white/10 dark:bg-black/30"
                  >
                    <div>
                      <p className="font-semibold text-neutral-950 dark:text-white">{post.title || 'Untitled'}</p>
                      <p className="text-xs text-neutral-500">
                        {post.focus_keyword || 'No focus keyword'} · {post.content_type} · {post.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/blogger/seo/${post.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-3 py-1.5 text-xs font-bold text-brand-600"
                      >
                        Open studio <ArrowRight size={12} />
                      </Link>
                      <button
                        type="button"
                        className="rounded-full p-2 text-red-500 hover:bg-red-500/10"
                        onClick={() =>
                          void (async () => {
                            if (!confirm('Delete this SEO draft?')) return;
                            await deleteSeoBlogPost(post.id);
                            await load();
                          })()
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5">
              <div className="mb-3 flex items-center gap-2 text-brand-500">
                <BarChart3 size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider">Quick research</h3>
              </div>
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
                placeholder="Focus keyword"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void onResearch()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 py-2.5 text-sm font-bold text-white"
              >
                <Search size={14} /> Run keyword research
              </button>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <div className="mb-2 flex items-center gap-2 text-amber-500">
                <AlertTriangle size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider">Decay watch</h3>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {decay.length} post{decay.length === 1 ? '' : 's'} untouched in 90+ days.
              </p>
              <button
                type="button"
                onClick={() => setTab('decay')}
                className="mt-3 text-xs font-bold text-brand-600"
              >
                View alerts →
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && tab === 'keywords' ? (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-black">Keyword Research Hub</h3>
          <p className="mt-1 text-sm text-neutral-500">Search volume, competition, long-tails & LSI seeds.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="py-2 pr-4">Keyword</th>
                  <th className="py-2 pr-4">Volume</th>
                  <th className="py-2 pr-4">Competition</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((row) => (
                  <tr key={row.id} className="border-t border-white/20 dark:border-white/10">
                    <td className="py-3 pr-4 font-semibold">{row.keyword}</td>
                    <td className="py-3 pr-4">{row.search_volume.toLocaleString()}</td>
                    <td className="py-3 pr-4 capitalize">{row.competition_level}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        className="text-xs font-bold text-brand-600"
                        onClick={() => void createDraft(`Guide: ${row.keyword}`, row.keyword)}
                      >
                        Draft from keyword
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!loading && tab === 'topics' ? (
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2 text-brand-500">
            <Flame size={18} />
            <h3 className="text-lg font-black text-neutral-950 dark:text-white">Topic Suggestion Engine</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {topics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => void createDraft(topic)}
                className="rounded-2xl border border-white/40 bg-white/50 p-4 text-left transition hover:border-brand-300 dark:border-white/10 dark:bg-black/30"
              >
                <p className="font-semibold text-neutral-950 dark:text-white">{topic}</p>
                <p className="mt-1 text-xs text-brand-600">Click to open SEO studio →</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && tab === 'competitors' ? (
        <div className="glass-card space-y-4 rounded-2xl p-6">
          <h3 className="text-lg font-black">Competitor Analysis</h3>
          <div className="flex flex-wrap gap-2">
            <input
              value={competitorKeyword}
              onChange={(e) => setCompetitorKeyword(e.target.value)}
              className="min-w-[240px] flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void onCompetitor()}
              className="rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white"
            >
              Analyse gaps
            </button>
          </div>
          {competitorResult ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Competitor URLs</p>
                <ul className="mt-2 space-y-2">
                  {competitorResult.competitor_urls.map((c) => (
                    <li key={c.url} className="rounded-xl bg-white/50 p-3 text-sm dark:bg-black/30">
                      <a href={c.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-600">
                        {c.title}
                      </a>
                      <p className="text-xs text-neutral-500">{c.strength}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Content gaps</p>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
                  {competitorResult.content_gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!loading && tab === 'decay' ? (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-black">Content Decay Alerts</h3>
          <p className="mt-1 text-sm text-neutral-500">Posts not updated in 90+ days — refresh before rankings slip.</p>
          <ul className="mt-4 space-y-3">
            {decay.length === 0 ? (
              <li className="text-sm text-neutral-500">No decaying drafts. Nice work.</li>
            ) : (
              decay.map((post) => (
                <li key={post.id} className="flex items-center justify-between rounded-xl bg-amber-500/10 px-4 py-3">
                  <div>
                    <p className="font-semibold">{post.title}</p>
                    <p className="text-xs text-neutral-500">Last updated {new Date(post.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Link href={`/blogger/seo/${post.id}`} className="text-xs font-bold text-brand-600">
                    Refresh now →
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
