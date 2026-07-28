'use client';

import { useMemo, useState } from 'react';
import {
  analyzeTone,
  authorityLinkSuggestions,
  convertToNewsletter,
  detectOrphanRisk,
  estimateTrafficValue,
  extractTweetableQuotes,
  fleschKincaidGrade,
  generateMetaVariants,
  grammarMagicWand,
  keywordHeatmapSpans,
} from '@/lib/seo/advanced-tools';

type Props = {
  title: string;
  contentHtml: string;
  focusKeyword: string;
  internalLinkCount: number;
  contentScore: number;
  onApplyTitle: (title: string) => void;
  onApplyMeta: (meta: string) => void;
  onApplyContent: (html: string) => void;
};

export function SeoAdvancedToolsPanel({
  title,
  contentHtml,
  focusKeyword,
  internalLinkCount,
  contentScore,
  onApplyTitle,
  onApplyMeta,
  onApplyContent,
}: Props) {
  const plain = useMemo(
    () => contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    [contentHtml]
  );
  const tone = useMemo(() => analyzeTone(plain), [plain]);
  const grade = useMemo(() => fleschKincaidGrade(plain), [plain]);
  const quotes = useMemo(() => extractTweetableQuotes(plain), [plain]);
  const metaAb = useMemo(
    () => generateMetaVariants(title, focusKeyword, plain),
    [focusKeyword, plain, title]
  );
  const heat = useMemo(() => keywordHeatmapSpans(plain, focusKeyword), [focusKeyword, plain]);
  const orphan = useMemo(
    () => detectOrphanRisk(internalLinkCount, 3),
    [internalLinkCount]
  );
  const authority = useMemo(
    () => authorityLinkSuggestions(focusKeyword || title),
    [focusKeyword, title]
  );
  const traffic = useMemo(
    () => estimateTrafficValue(2200 + focusKeyword.length * 40, contentScore),
    [contentScore, focusKeyword.length]
  );
  const [newsletter, setNewsletter] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="glass-card space-y-4 rounded-2xl p-4">
      <p className="text-xs font-black uppercase tracking-wider text-brand-500">10 new SEO tools</p>

      <div className="rounded-xl bg-white/40 p-3 text-xs dark:bg-black/30">
        <p className="font-bold">1. Tone & Sentiment</p>
        <p className="mt-1">
          {tone.tone} ({tone.confidence}%) — {tone.notes}
        </p>
      </div>

      <div className="rounded-xl bg-white/40 p-3 text-xs dark:bg-black/30">
        <p className="font-bold">2. Newsletter convert</p>
        <button
          type="button"
          className="mt-2 rounded-full bg-brand-500/15 px-3 py-1 font-bold text-brand-600"
          onClick={() => setNewsletter(convertToNewsletter(title, contentHtml))}
        >
          One-click email draft
        </button>
        {newsletter ? (
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/80 p-2 text-[11px] text-neutral-100">
            {newsletter}
          </pre>
        ) : null}
      </div>

      <div className="rounded-xl bg-white/40 p-3 text-xs dark:bg-black/30">
        <p className="font-bold">3. Reading grade (Flesch-Kincaid)</p>
        <p className="mt-1">
          Grade {grade.grade} · Ease {grade.readingEase} — {grade.label}
        </p>
      </div>

      <div className="rounded-xl bg-white/40 p-3 text-xs dark:bg-black/30">
        <p className="font-bold">4. Tweetable quotes</p>
        <ul className="mt-2 space-y-2">
          {quotes.length === 0 ? (
            <li className="text-neutral-500">Add punchy 1–2 sentence insights.</li>
          ) : (
            quotes.map((q, i) => (
              <li key={q} className="rounded-lg border border-white/10 p-2">
                <p>{q}</p>
                <button
                  type="button"
                  className="mt-1 font-bold text-brand-600"
                  onClick={() => void copy(q, `q${i}`)}
                >
                  {copied === `q${i}` ? 'Copied' : 'Copy'}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-xl bg-white/40 p-3 text-xs dark:bg-black/30">
        <p className="font-bold">5. Meta A/B generator</p>
        <ul className="mt-2 space-y-2">
          {metaAb.titles.map((t, i) => (
            <li key={t}>
              <button type="button" className="text-left font-semibold text-brand-600" onClick={() => onApplyTitle(t)}>
                Title {i + 1}: {t}
              </button>
            </li>
          ))}
          {metaAb.descriptions.map((d, i) => (
            <li key={d}>
              <button type="button" className="text-left text-neutral-600 dark:text-neutral-300" onClick={() => onApplyMeta(d)}>
                Meta {i + 1}: {d}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-white/40 p-3 text-xs dark:bg-black/30">
        <p className="font-bold">6. Keyword density heatmap</p>
        <p className={heat.overused ? 'mt-1 text-red-500' : 'mt-1 text-emerald-600'}>
          Density {heat.density}% {heat.overused ? '(overused — thin it)' : '(healthy)'}
        </p>
        {heat.highlights.map((h) => (
          <p key={h} className="mt-1 text-amber-600">
            {h}
          </p>
        ))}
      </div>

      <div className="rounded-xl bg-white/40 p-3 text-xs dark:bg-black/30">
        <p className="font-bold">7. Orphan page detector</p>
        <p className={`mt-1 ${orphan.isOrphanRisk ? 'text-amber-600' : 'text-emerald-600'}`}>{orphan.message}</p>
      </div>

      <div className="rounded-xl bg-white/40 p-3 text-xs dark:bg-black/30">
        <p className="font-bold">8. External authority suggestions</p>
        <ul className="mt-2 space-y-1">
          {authority.map((a) => (
            <li key={a.url}>
              <a href={a.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-600">
                {a.label}
              </a>{' '}
              <span className="text-neutral-500">{a.dr}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-white/40 p-3 text-xs dark:bg-black/30">
        <p className="font-bold">9. Grammar & formatting wand</p>
        <button
          type="button"
          className="mt-2 rounded-full bg-brand-500 px-3 py-1.5 font-bold text-white"
          onClick={() => onApplyContent(grammarMagicWand(contentHtml))}
        >
          Auto-fix spacing & H2/H3 caps
        </button>
      </div>

      <div className="rounded-xl bg-gradient-to-r from-brand-500/20 to-orange-400/10 p-3 text-xs">
        <p className="font-bold">10. Estimated traffic value</p>
        <p className="mt-1 text-lg font-black text-brand-600">{traffic.label}</p>
      </div>
    </div>
  );
}
