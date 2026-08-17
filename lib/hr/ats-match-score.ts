const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'are',
  'was',
  'were',
  'have',
  'has',
  'had',
  'not',
  'but',
  'you',
  'your',
  'our',
  'their',
  'they',
  'will',
  'can',
  'into',
  'about',
  'over',
  'after',
  'before',
  'such',
  'than',
  'then',
  'also',
  'more',
  'most',
  'other',
  'which',
  'while',
  'where',
  'when',
  'what',
  'who',
  'how',
  'been',
  'being',
  'able',
  'using',
  'use',
  'used',
  'including',
  'include',
  'includes',
  'across',
  'within',
  'role',
  'team',
  'work',
  'working',
  'experience',
  'skills',
  'skill',
  'required',
  'requirements',
  'preferred',
  'plus',
  'must',
  'should',
  'strong',
  'good',
  'great',
  'join',
  'oxyile',
  'company',
  'candidate',
  'position',
  'opportunity',
  'general',
  'focused',
  'looking',
  'seeking',
  'please',
]);

export type AtsJobMatchSource = {
  title?: string | null;
  role_applied?: string | null;
  keywords?: string | null;
  ai_match_keywords?: string | null;
  ai_keywords?: string | null;
  requirements?: string | null;
  description?: string | null;
  responsibilities?: string | null;
};

export type AtsMatchResult = {
  score: number;
  reason: string;
  matched: string[];
  missing: string[];
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOPWORDS.has(token) && !/^\d+$/.test(token));
}

function parseKeywords(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\n|/]+/)) {
    const display = part.trim().replace(/\s+/g, ' ');
    if (display.length < 2) continue;
    const key = display.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(display);
  }
  return out;
}

function uniqueTerms(text: string, limit = 20): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokenize(text)) {
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
    if (out.length >= limit) break;
  }
  return out;
}

function pushUnique(target: string[], seen: Set<string>, items: string[], limit = 28): void {
  for (const item of items) {
    if (target.length >= limit) return;
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    target.push(item.trim());
  }
}

function jobCorpus(job: AtsJobMatchSource): string {
  return [
    job.title,
    job.role_applied,
    job.keywords,
    job.ai_match_keywords,
    job.ai_keywords,
    job.requirements,
    job.description,
    job.responsibilities,
  ]
    .filter(Boolean)
    .join(' ');
}

function haystack(text: string): string {
  return ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;
}

function hasPhrase(hay: string, phrase: string): boolean {
  const needle = phrase.trim().toLowerCase();
  if (needle.length < 2) return false;
  if (hay.includes(` ${needle} `) || hay.includes(needle)) return true;
  const compactNeedle = needle.replace(/[.\s-]+/g, '');
  if (compactNeedle.length < 3) return false;
  return hay.replace(/[.\s-]+/g, '').includes(compactNeedle);
}

function formatKeyword(value: string): string {
  const trimmed = value.trim();
  if (/^[a-z0-9+#.-]+$/i.test(trimmed) && trimmed === trimmed.toUpperCase()) return trimmed;
  if (trimmed.length <= 4 && /[a-z]/i.test(trimmed)) return trimmed.toUpperCase();
  return trimmed.replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
}

export function collectTargetKeywords(job: AtsJobMatchSource): string[] {
  const explicit = parseKeywords(
    [job.keywords, job.ai_match_keywords, job.ai_keywords].filter(Boolean).join(', ')
  );
  const titleTerms = uniqueTerms([job.title, job.role_applied].filter(Boolean).join(' '), 10);
  const bodyTerms = uniqueTerms(
    [job.requirements, job.description, job.responsibilities].filter(Boolean).join(' '),
    24
  );

  const merged: string[] = [];
  const seen = new Set<string>();
  pushUnique(merged, seen, explicit);
  for (const item of explicit) {
    if (item.includes(' ')) pushUnique(merged, seen, uniqueTerms(item, 8));
  }
  pushUnique(merged, seen, titleTerms);
  pushUnique(merged, seen, explicit.length ? bodyTerms.slice(0, 12) : bodyTerms);
  return merged;
}

export function buildAtsReason(input: {
  score: number;
  matched: string[];
  missing: string[];
  resumeEmpty: boolean;
  noKeywords: boolean;
}): string {
  if (input.resumeEmpty) return 'Could not extract resume text.';
  if (input.noKeywords) return 'No job keywords available to match.';
  const foundList = input.matched.slice(0, 4).map(formatKeyword).join(', ');
  const missingList = input.missing.slice(0, 4).map(formatKeyword).join(', ');
  if (input.matched.length === 0) {
    return missingList
      ? `Poor match. Missing: ${missingList}`
      : 'Poor match. Resume did not match the job description.';
  }
  if (input.score >= 75) {
    return foundList ? `Strong match. Found: ${foundList}` : 'Strong match. All target keywords found.';
  }
  if (input.score >= 45) {
    return foundList
      ? `Partial match. Found: ${foundList}${missingList ? `. Missing: ${missingList}` : ''}`
      : 'Partial match.';
  }
  return missingList ? `Poor match. Missing: ${missingList}` : `Poor match. Found: ${foundList}`;
}

/**
 * Resume-vs-JD match: keyword hits plus token overlap so intern roles without
 * HR match-keywords still get a real 0–100 score.
 */
export function evaluateAtsMatch(resumeText: string, job: AtsJobMatchSource): AtsMatchResult {
  const resume = String(resumeText ?? '')
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const resumeLower = resume.toLowerCase();
  const keywords = collectTargetKeywords(job);
  const jobTokens = uniqueTerms(jobCorpus(job), 40);

  console.log('[ats] evaluateAtsMatch input', {
    resumeChars: resumeLower.length,
    resumePreview: resumeLower.slice(0, 500),
    title: job.title || job.role_applied,
    targetKeywords: keywords,
  });

  if (resumeLower.length < 20) {
    const result: AtsMatchResult = {
      score: 0,
      reason: buildAtsReason({
        score: 0,
        matched: [],
        missing: keywords,
        resumeEmpty: true,
        noKeywords: keywords.length === 0,
      }),
      matched: [],
      missing: keywords,
    };
    console.warn('[ats] resume text too short', result);
    return result;
  }

  if (!keywords.length && !jobTokens.length) {
    const result: AtsMatchResult = {
      score: 0,
      reason: buildAtsReason({
        score: 0,
        matched: [],
        missing: [],
        resumeEmpty: false,
        noKeywords: true,
      }),
      matched: [],
      missing: [],
    };
    console.warn('[ats] no target keywords on job posting', result);
    return result;
  }

  const hay = haystack(resumeLower);
  const resumeTokenSet = new Set(tokenize(resumeLower));
  const matched = keywords.filter((kw) => hasPhrase(hay, kw) || resumeTokenSet.has(kw.toLowerCase()));
  const missing = keywords.filter((kw) => !matched.includes(kw));
  const overlapHits = jobTokens.filter((token) => resumeTokenSet.has(token) || hasPhrase(hay, token));

  const keywordRate = keywords.length ? matched.length / keywords.length : 0;
  const overlapRate = jobTokens.length ? overlapHits.length / jobTokens.length : 0;
  const blended =
    keywords.length && jobTokens.length
      ? keywordRate * 0.55 + overlapRate * 0.45
      : keywords.length
        ? keywordRate
        : overlapRate;
  const score = Math.round(Math.max(0, Math.min(100, blended * 100)));
  const reason = buildAtsReason({
    score,
    matched,
    missing,
    resumeEmpty: false,
    noKeywords: false,
  });

  console.log('[ats] keyword match result', {
    hits: matched.length,
    total: keywords.length,
    overlapHits: overlapHits.length,
    jobTokens: jobTokens.length,
    matched: matched.slice(0, 20),
    missing: missing.slice(0, 20),
    score,
    reason,
  });

  return { score, reason, matched, missing };
}

export function computeAtsMatchScore(resumeText: string, job: AtsJobMatchSource): number {
  return evaluateAtsMatch(resumeText, job).score;
}

export function scoreResumeAgainstRequirements(resumeText: string, requirements: string): number {
  return evaluateAtsMatch(resumeText, { requirements, keywords: requirements }).score;
}
