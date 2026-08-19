/** Client-safe SEO scoring utilities for the Blogger SEO Content Engine. */

export type SeoChecklistItem = {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  hint: string;
};

export type ReadabilityIssue = {
  type: 'complex' | 'passive' | 'jargon';
  sentence: string;
  suggestion: string;
};

export type SeoAnalysis = {
  contentScore: number;
  readabilityScore: number;
  keywordDensity: number;
  titleScore: number;
  metaScore: number;
  headingScore: number;
  linkScore: number;
  voiceSearchScore: number;
  trustScore: number;
  predictedCtr: number;
  readTimeMinutes: number;
  wordCount: number;
  checklist: SeoChecklistItem[];
  readabilityIssues: ReadabilityIssue[];
  snippetCandidates: string[];
  headings: { level: number; text: string }[];
  internalLinks: string[];
  externalLinks: string[];
  contentType: 'evergreen' | 'trending' | 'news';
};

const JARGON = [
  'synergistic',
  'leverage',
  'paradigm',
  'holistic',
  'disruptive',
  'bandwidth',
  'circle back',
  'low-hanging fruit',
];

const FINTECH_TRENDING = [
  'Open banking vs Direct Debit for repayment collections',
  'How UK P2P platforms safeguard client money',
  'FCA-aligned KYC checklist for digital lenders',
  'Fixed-rate lending: pricing risk for retail investors',
  'GoCardless Billing Request Flow deep dive',
  'Guarantor mandates: when backup rails matter',
  'Polygon settlement records for fiat loans',
  'Tax treatment of peer-to-peer interest in the UK',
];

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

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function slugifySeo(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function extractHeadings(html: string): { level: number; text: string }[] {
  const out: { level: number; text: string }[] = [];
  const re = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    out.push({ level: Number(match[1]), text: stripHtml(match[2]) });
  }
  return out;
}

export function extractLinks(html: string): { href: string; internal: boolean }[] {
  const out: { href: string; internal: boolean }[] = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const href = match[1];
    const internal =
      href.startsWith('/') ||
      href.includes('oxyile') ||
      href.includes('localhost');
    out.push({ href, internal });
  }
  return out;
}

function sentenceSplit(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

export function analyzeReadability(plain: string): {
  score: number;
  issues: ReadabilityIssue[];
} {
  const sentences = sentenceSplit(plain);
  const issues: ReadabilityIssue[] = [];
  let complex = 0;
  let passive = 0;
  let jargonHits = 0;

  for (const sentence of sentences) {
    const w = words(sentence);
    if (w.length > 28) {
      complex += 1;
      issues.push({
        type: 'complex',
        sentence: sentence.slice(0, 140),
        suggestion: 'Split into two shorter sentences (aim < 25 words).',
      });
    }
    if (/\b(is|are|was|were|be|been|being)\s+\w+ed\b/i.test(sentence)) {
      passive += 1;
      issues.push({
        type: 'passive',
        sentence: sentence.slice(0, 140),
        suggestion: 'Prefer active voice for clearer SEO and voice-search answers.',
      });
    }
    for (const j of JARGON) {
      if (sentence.toLowerCase().includes(j)) {
        jargonHits += 1;
        issues.push({
          type: 'jargon',
          sentence: sentence.slice(0, 140),
          suggestion: `Replace jargon (“${j}”) with plain FinTech language.`,
        });
        break;
      }
    }
  }

  const total = Math.max(sentences.length, 1);
  const penalty = (complex / total) * 35 + (passive / total) * 25 + (jargonHits / total) * 20;
  const avgLen = words(plain).length / total;
  const lengthBonus = avgLen >= 12 && avgLen <= 22 ? 15 : 0;
  return {
    score: clamp(100 - penalty + lengthBonus),
    issues: issues.slice(0, 12),
  };
}

export function keywordDensity(plain: string, focusKeyword: string): number {
  const kw = focusKeyword.trim().toLowerCase();
  if (!kw) return 0;
  const text = plain.toLowerCase();
  const occurrences = text.split(kw).length - 1;
  const total = Math.max(words(plain).length, 1);
  const kwWords = Math.max(words(kw).length, 1);
  return Number(((occurrences * kwWords * 100) / total).toFixed(2));
}

export function detectFeaturedSnippetCandidates(html: string, plain: string): string[] {
  const candidates: string[] = [];
  if (/<(ul|ol)[\s\S]*?<\/\1>/i.test(html)) {
    candidates.push('Numbered/bulleted list detected — strong Featured Snippet candidate.');
  }
  if (/<table[\s\S]*?<\/table>/i.test(html)) {
    candidates.push('Table markup found — eligible for table snippets.');
  }
  const shortAnswers = sentenceSplit(plain).filter((s) => words(s).length >= 20 && words(s).length <= 45);
  if (shortAnswers[0]) {
    candidates.push(`Concise answer paragraph: “${shortAnswers[0].slice(0, 90)}…”`);
  }
  if (/^what |^how |^why |^when /i.test(plain)) {
    candidates.push('Question-led opening improves Position Zero odds for voice queries.');
  }
  return candidates.slice(0, 4);
}

export function predictContentType(title: string, plain: string): 'evergreen' | 'trending' | 'news' {
  const blob = `${title} ${plain}`.toLowerCase();
  if (/\b(today|breaking|this week|2026 update|announces|just launched)\b/.test(blob)) return 'news';
  if (/\b(trend|rising|hot|surge|viral)\b/.test(blob)) return 'trending';
  return 'evergreen';
}

export function analyzeSeoContent(input: {
  title: string;
  metaDescription: string;
  html: string;
  focusKeyword: string;
  slug?: string;
}): SeoAnalysis {
  const plain = stripHtml(input.html);
  const w = words(plain);
  const wordCount = w.length;
  const density = keywordDensity(plain, input.focusKeyword);
  const headings = extractHeadings(input.html);
  const links = extractLinks(input.html);
  const internalLinks = links.filter((l) => l.internal).map((l) => l.href);
  const externalLinks = links.filter((l) => !l.internal).map((l) => l.href);
  const readability = analyzeReadability(plain);
  const kw = input.focusKeyword.trim().toLowerCase();
  const titleHasKw = kw ? input.title.toLowerCase().includes(kw) : false;
  const metaHasKw = kw ? input.metaDescription.toLowerCase().includes(kw) : false;
  const h2Count = headings.filter((h) => h.level === 2).length;
  const titleLen = input.title.trim().length;
  const metaLen = input.metaDescription.trim().length;

  const checklist: SeoChecklistItem[] = [
    {
      id: 'title-length',
      label: 'Title length 50–60 characters',
      passed: titleLen >= 50 && titleLen <= 60,
      weight: 10,
      hint: `Current: ${titleLen} chars`,
    },
    {
      id: 'title-keyword',
      label: 'Focus keyword in title',
      passed: titleHasKw,
      weight: 12,
      hint: 'Place the primary keyword near the start of the title.',
    },
    {
      id: 'meta-length',
      label: 'Meta description 120–160 characters',
      passed: metaLen >= 120 && metaLen <= 160,
      weight: 10,
      hint: `Current: ${metaLen} chars`,
    },
    {
      id: 'meta-keyword',
      label: 'Focus keyword in meta description',
      passed: metaHasKw,
      weight: 8,
      hint: 'Include the keyword naturally once.',
    },
    {
      id: 'h2-structure',
      label: 'At least 2 H2 headings',
      passed: h2Count >= 2,
      weight: 10,
      hint: `Found ${h2Count} H2 tags`,
    },
    {
      id: 'keyword-density',
      label: 'Keyword density 0.8%–2.5%',
      passed: density >= 0.8 && density <= 2.5,
      weight: 12,
      hint: `Density: ${density}%`,
    },
    {
      id: 'word-count',
      label: 'Body ≥ 800 words (pillar-ready)',
      passed: wordCount >= 800,
      weight: 10,
      hint: `Word count: ${wordCount}`,
    },
    {
      id: 'internal-links',
      label: '≥ 2 internal links',
      passed: internalLinks.length >= 2,
      weight: 8,
      hint: `Internal links: ${internalLinks.length}`,
    },
    {
      id: 'external-links',
      label: '≥ 1 authoritative external link',
      passed: externalLinks.length >= 1,
      weight: 6,
      hint: `External links: ${externalLinks.length}`,
    },
    {
      id: 'slug',
      label: 'Clean SEO slug',
      passed: Boolean(input.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)),
      weight: 4,
      hint: input.slug || 'Missing slug',
    },
  ];

  const checklistScore =
    checklist.reduce((sum, item) => sum + (item.passed ? item.weight : 0), 0) /
    checklist.reduce((sum, item) => sum + item.weight, 0);

  const titleScore = clamp((titleHasKw ? 55 : 20) + (titleLen >= 50 && titleLen <= 60 ? 45 : titleLen > 0 ? 20 : 0));
  const metaScore = clamp((metaHasKw ? 50 : 15) + (metaLen >= 120 && metaLen <= 160 ? 50 : metaLen > 0 ? 20 : 0));
  const headingScore = clamp(h2Count >= 3 ? 95 : h2Count >= 2 ? 75 : h2Count === 1 ? 45 : 15);
  const linkScore = clamp(
    internalLinks.length * 25 + externalLinks.length * 20,
    0,
    100
  );
  const voiceSearchScore = clamp(
    readability.score * 0.5 +
      (/\?/.test(plain) ? 15 : 0) +
      (sentenceSplit(plain).some((s) => words(s).length <= 20) ? 20 : 0) +
      (h2Count >= 2 ? 15 : 0)
  );
  const trustScore = clamp(
    70 +
      (externalLinks.length > 0 ? 10 : 0) +
      (wordCount > 600 ? 10 : 0) -
      readability.issues.filter((i) => i.type === 'jargon').length * 5
  );
  const contentScore = clamp(
    checklistScore * 70 + readability.score * 0.2 + Math.min(density, 2.5) * 4
  );
  const predictedCtr = clamp(
    (titleScore * 0.45 + metaScore * 0.35 + (titleHasKw ? 15 : 0)) * 0.85
  );
  const readTimeMinutes = Number(Math.max(0.5, wordCount / 220).toFixed(1));

  return {
    contentScore,
    readabilityScore: readability.score,
    keywordDensity: density,
    titleScore,
    metaScore,
    headingScore,
    linkScore,
    voiceSearchScore,
    trustScore,
    predictedCtr,
    readTimeMinutes,
    wordCount,
    checklist,
    readabilityIssues: readability.issues,
    snippetCandidates: detectFeaturedSnippetCandidates(input.html, plain),
    headings,
    internalLinks,
    externalLinks,
    contentType: predictContentType(input.title, plain),
  };
}

export function getTrendingFintechTopics(): string[] {
  return [...FINTECH_TRENDING];
}

export function mockCompetitorGaps(keyword: string): {
  competitor_urls: { url: string; title: string; strength: string }[];
  content_gaps: string[];
} {
  const k = keyword.trim() || 'p2p lending';
  return {
    competitor_urls: [
      {
        url: `https://www.fca.org.uk/search?q=${encodeURIComponent(k)}`,
        title: `FCA resources on ${k}`,
        strength: 'High authority · thin commercial intent',
      },
      {
        url: `https://www.investopedia.com/search?q=${encodeURIComponent(k)}`,
        title: `Investopedia: ${k} overview`,
        strength: 'Strong definitions · weak UK compliance angle',
      },
      {
        url: `https://www.which.co.uk/search?q=${encodeURIComponent(k)}`,
        title: `Which?: consumer take on ${k}`,
        strength: 'Trust signals · limited product depth',
      },
    ],
    content_gaps: [
      `UK-specific repayment / Direct Debit operational walkthrough for “${k}”`,
      'Side-by-side risk table for retail investors vs institutional lenders',
      'Original calculator or worked example with GBP figures',
      'Guarantor / co-applicant coverage (rarely addressed)',
      'On-chain settlement audit narrative for transparency',
    ],
  };
}

export function mockLongTailAndLsi(keyword: string): {
  longTail: string[];
  lsi: string[];
} {
  const k = keyword.trim() || 'peer to peer lending';
  return {
    longTail: [
      `best ${k} platforms uk`,
      `is ${k} safe for beginners`,
      `${k} tax implications uk`,
      `how to start with ${k} in 2026`,
      `${k} vs traditional bank loan`,
    ],
    lsi: [
      'alternative finance',
      'marketplace lending',
      'direct debit collections',
      'investor diversification',
      'borrower underwriting',
      'default rate',
      'client money safeguarding',
    ],
  };
}

export function mockAutocomplete(prefix: string, focusKeyword: string): string {
  const seed = prefix.trim().slice(-80);
  const kw = focusKeyword || 'peer-to-peer lending';
  return `${seed} In the UK ${kw} market, transparent underwriting, safeguarded client money, and predictable monthly repayments via Direct Debit remain the pillars of investor trust.`.trim();
}

export function generateSocialRepurpose(title: string, plain: string): {
  twitterThread: string[];
  linkedIn: string;
} {
  const sentences = sentenceSplit(plain).slice(0, 5);
  const twitterThread = [
    `🧵 ${title || 'New FinTech insight'}`,
    ...sentences.map((s, i) => `${i + 1}/ ${s.slice(0, 240)}`),
    'Follow Oxyile for more UK P2P lending clarity. #FinTech #P2PLending #UKFinance',
  ];
  const linkedIn = [
    title || 'FinTech insight',
    '',
    sentences.slice(0, 3).join(' '),
    '',
    'Key takeaway: clarity beats hype — especially when capital and compliance meet.',
    '',
    '#FinTech #Lending #OpenBanking #Compliance',
  ].join('\n');
  return { twitterThread, linkedIn };
}

export function scoreHeadlines(variants: string[], focusKeyword: string): {
  title: string;
  predictedCtr: number;
  notes: string;
}[] {
  return variants
    .filter((v) => v.trim())
    .map((title) => {
      const len = title.length;
      const hasKw = focusKeyword && title.toLowerCase().includes(focusKeyword.toLowerCase());
      const hasPower = /\b(guide|how|why|best|uk|2026|checklist|proven)\b/i.test(title);
      const score = clamp((hasKw ? 40 : 10) + (len >= 45 && len <= 60 ? 35 : 15) + (hasPower ? 20 : 5));
      return {
        title,
        predictedCtr: score,
        notes: [
          hasKw ? 'Keyword present' : 'Add focus keyword',
          len >= 45 && len <= 60 ? 'Ideal length' : `Length ${len}`,
          hasPower ? 'Power word found' : 'Add a power word',
        ].join(' · '),
      };
    })
    .sort((a, b) => b.predictedCtr - a.predictedCtr);
}

export const INTERNAL_LINK_SUGGESTIONS = [
  { href: '/blogs', label: 'Oxyile Blog Hub', reason: 'Category pillar' },
  { href: '/signup', label: 'Create investor/borrower account', reason: 'Conversion CTA' },
  { href: '/', label: 'Oxyile homepage', reason: 'Brand authority' },
  { href: '/signin', label: 'Member sign in', reason: 'Returning users' },
];

export const EXTERNAL_AUTHORITY_LINKS = [
  { href: 'https://www.fca.org.uk/', label: 'Financial Conduct Authority', reason: 'UK regulator' },
  { href: 'https://www.gocardless.com/', label: 'GoCardless', reason: 'Payments rail' },
  { href: 'https://www.gov.uk/government/organisations/hm-revenue-customs', label: 'HMRC', reason: 'Tax authority' },
  { href: 'https://www.bankofengland.co.uk/', label: 'Bank of England', reason: 'Macro context' },
];

export const MULTILINGUAL_HINTS = [
  { region: 'Ireland', language: 'English (IE)', opportunity: 'High search interest, thin local P2P explainers' },
  { region: 'India (NRI audience)', language: 'English', opportunity: 'GBP remittance + UK lending education gap' },
  { region: 'UAE', language: 'English / Arabic', opportunity: 'Expat finance queries rising' },
  { region: 'Germany', language: 'German', opportunity: 'Crowdlending comparisons underserved' },
];
