/** Extended SEO helpers — tone, Flesch, newsletter, tweets, meta A/B, traffic value, etc. */

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 1;
  const matches = w.match(/[aeiouy]{1,2}/g);
  let count = matches ? matches.length : 1;
  if (w.endsWith('e') && count > 1) count -= 1;
  return Math.max(1, count);
}

export type ToneLabel = 'Authoritative' | 'Conversational' | 'Urgent';

export function analyzeTone(plain: string): { tone: ToneLabel; confidence: number; notes: string } {
  const text = plain.toLowerCase();
  const urgent = (text.match(/\b(now|today|urgent|immediately|don't wait|limited|act)\b/g) || []).length;
  const auth = (text.match(/\b(must|should|evidence|compliance|fca|framework|analysis|data)\b/g) || []).length;
  const convo = (text.match(/\b(you|your|let's|we'll|imagine|here's)\b/g) || []).length;
  const scores = [
    { tone: 'Urgent' as const, n: urgent },
    { tone: 'Authoritative' as const, n: auth },
    { tone: 'Conversational' as const, n: convo },
  ].sort((a, b) => b.n - a.n);
  const top = scores[0];
  const total = Math.max(urgent + auth + convo, 1);
  return {
    tone: top.tone,
    confidence: Math.round((top.n / total) * 100),
    notes:
      top.tone === 'Authoritative'
        ? 'Strong compliance/expertise language — good for trust.'
        : top.tone === 'Urgent'
          ? 'CTA energy is high — balance with facts for FinTech trust.'
          : 'Friendly second-person voice — great for explainers.',
  };
}

export function fleschKincaidGrade(plain: string): {
  grade: number;
  label: string;
  readingEase: number;
} {
  const w = words(plain);
  const s = Math.max(sentences(plain).length, 1);
  const syllables = w.reduce((sum, word) => sum + countSyllables(word), 0);
  const wc = Math.max(w.length, 1);
  const readingEase = 206.835 - 1.015 * (wc / s) - 84.6 * (syllables / wc);
  const grade = 0.39 * (wc / s) + 11.8 * (syllables / wc) - 15.59;
  const g = Math.max(1, Math.min(16, Math.round(grade * 10) / 10));
  return {
    grade: g,
    readingEase: Math.round(Math.max(0, Math.min(100, readingEase))),
    label: g <= 8 ? '8th-grade friendly ✓' : g <= 10 ? 'Slightly advanced' : 'Too complex — simplify',
  };
}

export function convertToNewsletter(title: string, html: string): string {
  const plain = stripHtml(html);
  const bits = sentences(plain).slice(0, 6);
  return [
    `Subject: ${title || 'This week in UK FinTech'}`,
    '',
    'Hi {{first_name}},',
    '',
    bits.slice(0, 2).join(' '),
    '',
    'Key points:',
    ...bits.slice(2, 5).map((b, i) => `${i + 1}. ${b}`),
    '',
    'Read the full guide on Oxyile → {{blog_url}}',
    '',
    '— The Oxyile Editorial Team',
  ].join('\n');
}

export function extractTweetableQuotes(plain: string): string[] {
  return sentences(plain)
    .filter((s) => {
      const len = s.length;
      return len >= 60 && len <= 220 && !s.includes('http');
    })
    .slice(0, 8)
    .sort((a, b) => Math.abs(140 - a.length) - Math.abs(140 - b.length))
    .slice(0, 3);
}

export function generateMetaVariants(title: string, focusKeyword: string, plain: string): {
  titles: string[];
  descriptions: string[];
} {
  const kw = focusKeyword.trim() || 'P2P lending';
  const hook = sentences(plain)[0]?.slice(0, 110) || `Learn how ${kw} works for UK investors and borrowers.`;
  return {
    titles: [
      `${kw}: A Practical UK Guide for 2026`,
      `How ${kw} Actually Works (Clear & Compliant)`,
      `The ${kw} Checklist Every Investor Should Know`,
    ],
    descriptions: [
      `${hook}`.slice(0, 155),
      `Discover ${kw} with clear repayment schedules, risk, and compliance context for the UK market.`.slice(0, 155),
      `Oxyile explains ${kw} — safeguarding, Direct Debit, and what retail lenders should watch.`.slice(0, 155),
    ],
  };
}

export function keywordHeatmapSpans(plain: string, focusKeyword: string): {
  overused: boolean;
  density: number;
  highlights: string[];
} {
  const kw = focusKeyword.trim().toLowerCase();
  if (!kw) return { overused: false, density: 0, highlights: [] };
  const occurrences = plain.toLowerCase().split(kw).length - 1;
  const total = Math.max(words(plain).length, 1);
  const density = Number((((occurrences * Math.max(words(kw).length, 1)) / total) * 100).toFixed(2));
  return {
    overused: density > 2.5,
    density,
    highlights: density > 2.5 ? [`“${kw}” appears ${occurrences} times (${density}%) — thin it out.`] : [],
  };
}

export function detectOrphanRisk(internalLinkCount: number, publishedPeerCount: number): {
  isOrphanRisk: boolean;
  message: string;
} {
  if (publishedPeerCount === 0) {
    return {
      isOrphanRisk: true,
      message: 'No other published posts yet — this draft may become an orphan page. Plan hub links.',
    };
  }
  if (internalLinkCount === 0) {
    return {
      isOrphanRisk: true,
      message: 'No internal links in this draft — orphan risk is high until other posts link here.',
    };
  }
  return { isOrphanRisk: false, message: 'Internal links present — orphan risk reduced.' };
}

export function authorityLinkSuggestions(topic: string): { url: string; label: string; dr: string }[] {
  const q = encodeURIComponent(topic || 'peer to peer lending');
  return [
    { url: `https://www.fca.org.uk/search-results?search_term=${q}`, label: 'FCA — UK regulator', dr: 'DR 91' },
    { url: 'https://www.bankofengland.co.uk/', label: 'Bank of England', dr: 'DR 90' },
    { url: 'https://www.gocardless.com/guides/', label: 'GoCardless Guides', dr: 'DR 78' },
  ];
}

export function grammarMagicWand(html: string): string {
  return html
    .replace(/ {2,}/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (_, attrs, inner) => {
      const text = stripHtml(inner)
        .split(' ')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
        .join(' ');
      return `<h2${attrs}>${text}</h2>`;
    })
    .replace(/<h3([^>]*)>(.*?)<\/h3>/gi, (_, attrs, inner) => {
      const text = stripHtml(inner)
        .split(' ')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
        .join(' ');
      return `<h3${attrs}>${text}</h3>`;
    });
}

export function estimateTrafficValue(searchVolume: number, contentScore: number): {
  monthlyValueGbp: number;
  label: string;
} {
  const cpc = 1.8 + (searchVolume % 7) * 0.35;
  const ctr = Math.max(0.01, contentScore / 100) * 0.12;
  const clicks = searchVolume * ctr;
  const value = Math.round(clicks * cpc);
  const formatted = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
  return {
    monthlyValueGbp: value,
    label: `~${formatted}/mo estimated traffic value`,
  };
}

export type SeoGuideFeature = {
  id: string;
  name: string;
  what: string;
  where: string;
  how: string;
  benefit: string;
  group: string;
};

export const SEO_GUIDE_FEATURES: SeoGuideFeature[] = [
  {
    id: 'keyword-hub',
    name: 'Keyword Research Hub',
    what: 'Search volume, competition, long-tail and LSI seeds for FinTech topics.',
    where: 'Blogger → SEO Studio → Keyword Hub tab',
    how: 'Enter a keyword → Run research → Draft from keyword.',
    benefit: 'Targets demand with realistic competition before you write.',
    group: 'Research',
  },
  {
    id: 'topic-engine',
    name: 'Topic Suggestion Engine',
    what: 'Trending UK lending / FinTech angles ready to draft.',
    where: 'SEO Studio → Topic Engine',
    how: 'Click a topic card to open a pre-titled SEO draft.',
    benefit: 'Cuts ideation time and stays niche-relevant.',
    group: 'Research',
  },
  {
    id: 'competitor',
    name: 'Competitor Analysis',
    what: 'Competitor URLs + content gaps for a focus keyword.',
    where: 'SEO Studio → Competitors',
    how: 'Enter keyword → Analyse gaps → Cover missing angles in your outline.',
    benefit: 'Wins rankings by filling what competitors skip.',
    group: 'Research',
  },
  {
    id: 'checklist',
    name: 'Real-Time On-Page SEO Checklist',
    what: 'Live checks for title, meta, H2s, density, links, length.',
    where: 'SEO draft studio right sidebar',
    how: 'Write while watching green/red checks; fix failing items before submit.',
    benefit: 'Prevents publishing thin or under-optimized pages.',
    group: 'On-page',
  },
  {
    id: 'readability',
    name: 'Readability Scorer',
    what: 'Flags complex sentences, passive voice, and jargon.',
    where: 'SEO studio → Readability scorer panel',
    how: 'Rewrite flagged sentences into shorter active voice.',
    benefit: 'Higher engagement and better voice-search answers.',
    group: 'On-page',
  },
  {
    id: 'serp',
    name: 'SERP Preview',
    what: 'Desktop/mobile Google result mock for title + meta.',
    where: 'SEO studio main column',
    how: 'Toggle Desktop/Mobile and adjust title/meta until it looks clickable.',
    benefit: 'Improves CTR before you ever rank.',
    group: 'On-page',
  },
  {
    id: 'links',
    name: 'Link Suggestion Engine',
    what: 'Internal pages + high-authority external domains.',
    where: 'SEO studio → Link suggestions',
    how: 'Click suggestions to insert anchors into the body.',
    benefit: 'Builds topical authority and trust signals.',
    group: 'On-page',
  },
  {
    id: 'copilot',
    name: 'AI Content Autocomplete',
    what: 'Shift+Tab continues your thought in FinTech voice.',
    where: 'SEO studio editor',
    how: 'Write a lead-in, press Shift+Tab, edit the inserted paragraph.',
    benefit: 'Breaks writer’s block without leaving the page.',
    group: 'AI assist',
  },
  {
    id: 'lsi',
    name: 'LSI Keyword Injector',
    what: 'Semantic terms to sprinkle for topical depth.',
    where: 'SEO studio → LSI injector',
    how: 'Click a chip to insert a natural LSI prompt paragraph.',
    benefit: 'Covers related entities Google expects.',
    group: 'AI assist',
  },
  {
    id: 'trust',
    name: 'Plagiarism & AI Trust Score',
    what: 'Human-like trust heuristic from jargon/links/depth.',
    where: 'Live SEO scores → Trust / human',
    how: 'Raise trust by adding sources and cutting buzzwords.',
    benefit: 'Signals original, compliant editorial quality.',
    group: 'AI assist',
  },
  {
    id: 'social',
    name: 'Social Media Repurposing',
    what: 'One-click Twitter thread + LinkedIn post.',
    where: 'SEO studio → Social repurposing',
    how: 'Generate, copy, schedule on social.',
    benefit: 'Amplifies distribution without rewriting.',
    group: 'Distribution',
  },
  {
    id: 'voice',
    name: 'Voice Search Analyzer',
    what: 'Scores how well content answers spoken queries.',
    where: 'Live scores → Voice search',
    how: 'Add concise Q&A style H2s and short answer paragraphs.',
    benefit: 'Captures Siri/Alexa-style long-tail traffic.',
    group: 'Advanced',
  },
  {
    id: 'snippet',
    name: 'Featured Snippet Optimizer',
    what: 'Flags lists/definitions for Position Zero.',
    where: 'Snippet + voice panel',
    how: 'Add a 40-word definition or numbered steps near the top.',
    benefit: 'Competes for Google’s featured answer box.',
    group: 'Advanced',
  },
  {
    id: 'decay',
    name: 'Content Decay Alerts',
    what: 'Surfaces drafts untouched for 90+ days.',
    where: 'SEO Studio → Decay Alerts',
    how: 'Open aging posts, refresh stats/examples, republish.',
    benefit: 'Protects rankings before traffic slips.',
    group: 'Advanced',
  },
  {
    id: 'ab-title',
    name: 'A/B Headline Tester',
    what: 'Scores 3 title variants for predicted CTR.',
    where: 'SEO studio → A/B headline tester',
    how: 'Enter variants → Use the top scorer as your title.',
    benefit: 'Data-informed headlines beat guesswork.',
    group: 'Advanced',
  },
  {
    id: 'readtime',
    name: 'Read-Time & Engagement Predictor',
    what: 'Estimated minutes and scroll-depth prediction.',
    where: 'Editor status bar + live scores',
    how: 'Aim for clear H2 structure to lift predicted depth.',
    benefit: 'Aligns length with audience attention.',
    group: 'Advanced',
  },
  {
    id: 'cannibal',
    name: 'Cannibalization Warning',
    what: 'Alerts if another draft shares the same focus keyword.',
    where: 'Yellow banner under focus keyword',
    how: 'Differentiate keywords or merge overlapping drafts.',
    benefit: 'Stops your own pages competing with each other.',
    group: 'Advanced',
  },
  {
    id: 'toc',
    name: 'Sticky Table of Contents',
    what: 'Auto H2/H3 outline.',
    where: 'SEO studio → TOC card',
    how: 'Add headings; TOC updates live.',
    benefit: 'Improves UX and crawlable structure.',
    group: 'On-page',
  },
  {
    id: 'alt',
    name: 'Image Alt-Text AI',
    what: 'Generates SEO-friendly alt text.',
    where: 'SEO studio → Image alt AI',
    how: 'Click Generate, then tweak for accuracy.',
    benefit: 'Accessibility + image search visibility.',
    group: 'On-page',
  },
  {
    id: 'i18n',
    name: 'Multilingual SEO Expanding',
    what: 'Regions where the topic is underserved.',
    where: 'Multilingual SEO panel',
    how: 'Prioritize locales for future translations.',
    benefit: 'Opens international long-tail demand.',
    group: 'Advanced',
  },
  {
    id: 'graph',
    name: 'Dynamic Internal Link Graph',
    what: 'Visual map of links from this draft.',
    where: 'Internal link graph panel',
    how: 'Add internal links until the graph fills out.',
    benefit: 'Strengthens site architecture.',
    group: 'Advanced',
  },
  {
    id: 'evergreen',
    name: 'Evergreen vs Trending Tag',
    what: 'Classifies pillar vs news-style content.',
    where: 'Top badge on SEO studio',
    how: 'Adjust wording if you want evergreen longevity.',
    benefit: 'Sets the right update cadence.',
    group: 'Advanced',
  },
  {
    id: 'tone',
    name: 'Tone & Sentiment Analyzer',
    what: 'Detects Authoritative, Conversational, or Urgent tone.',
    where: 'SEO studio → New tools panel',
    how: 'Rewrite until tone matches the audience intent.',
    benefit: 'Matches SERP intent and brand voice.',
    group: 'New 2026 tools',
  },
  {
    id: 'newsletter',
    name: 'Newsletter One-Click Convert',
    what: 'Turns a long post into a ~300-word email.',
    where: 'New tools → Newsletter convert',
    how: 'Generate, copy into Admin Newsletter broadcast.',
    benefit: 'Recycles SEO content into owned channels.',
    group: 'New 2026 tools',
  },
  {
    id: 'flesch',
    name: 'Reading Grade Level Scorer',
    what: 'Flesch-Kincaid grade aiming for ~8th grade.',
    where: 'New tools → Grade level',
    how: 'Shorten sentences until grade ≤ 8.',
    benefit: 'Broader comprehension = more engagement.',
    group: 'New 2026 tools',
  },
  {
    id: 'tweets',
    name: 'Auto-Tweet Quote Extractor',
    what: 'Highlights 3 tweetable quotes with copy.',
    where: 'New tools → Tweet quotes',
    how: 'Copy the best line into X/LinkedIn.',
    benefit: 'Faster social syndication.',
    group: 'New 2026 tools',
  },
  {
    id: 'meta-ab',
    name: 'Meta Tags A/B Generator',
    what: '3 SEO titles + 3 meta descriptions.',
    where: 'New tools → Meta A/B',
    how: 'Apply a variant to title/meta fields.',
    benefit: 'Higher SERP CTR experiments.',
    group: 'New 2026 tools',
  },
  {
    id: 'heatmap',
    name: 'Keyword Density Heatmap',
    what: 'Warns when focus keyword is overused.',
    where: 'New tools → Density heatmap',
    how: 'Thin repetitions if density > 2.5%.',
    benefit: 'Avoids keyword stuffing penalties.',
    group: 'New 2026 tools',
  },
  {
    id: 'orphan',
    name: 'Orphan Page Detector',
    what: 'Warns if the draft lacks internal link support.',
    where: 'New tools → Orphan alert',
    how: 'Add hub links from/to related posts.',
    benefit: 'Keeps new URLs discoverable.',
    group: 'New 2026 tools',
  },
  {
    id: 'authority',
    name: 'External Authority Scraper',
    what: 'Suggests high-DR sites to cite.',
    where: 'New tools → Authority links',
    how: 'Insert 1–2 citations with descriptive anchors.',
    benefit: 'E-E-A-T and topical trust.',
    group: 'New 2026 tools',
  },
  {
    id: 'wand',
    name: 'Grammar & Formatting Magic Wand',
    what: 'Fixes double spaces and title-cases H2/H3.',
    where: 'New tools → Magic wand',
    how: 'One click, then review headings.',
    benefit: 'Cleaner crawlable structure.',
    group: 'New 2026 tools',
  },
  {
    id: 'traffic-value',
    name: 'Estimated Traffic Value Calculator',
    what: 'Mock £/mo value from volume × score × CPC (GBP).',
    where: 'New tools → Traffic value',
    how: 'Use to prioritize which draft to finish first.',
    benefit: 'Aligns editorial effort with ROI.',
    group: 'New 2026 tools',
  },
];
