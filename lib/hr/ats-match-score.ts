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
]);

export type AtsJobMatchSource = {
  keywords?: string | null;
  ai_match_keywords?: string | null;
  ai_keywords?: string | null;
  requirements?: string | null;
  description?: string | null;
  responsibilities?: string | null;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOPWORDS.has(token) && !/^\d+$/.test(token));
}

function parsePhrases(raw: string): string[] {
  return raw
    .split(/[,;\n|/]+/)
    .map((phrase) => phrase.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter((phrase) => phrase.length > 1);
}

function uniqueTerms(text: string, limit = 48): string[] {
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

function coverage(hay: string, terms: string[]): number | null {
  if (!terms.length) return null;
  const hits = terms.filter((term) => hasPhrase(hay, term)).length;
  return hits / terms.length;
}

/**
 * Deterministic 0–100 ATS match: resume text vs Match Keywords + job description.
 * No random component. Empty / unreadable resumes score 0.
 */
export function computeAtsMatchScore(resumeText: string, job: AtsJobMatchSource): number {
  const resume = String(resumeText ?? '')
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (resume.length < 40) return 0;

  const hay = haystack(resume);
  const keywordSource = [job.keywords, job.ai_match_keywords, job.ai_keywords]
    .filter(Boolean)
    .join(', ');
  const keywords = [...new Set(parsePhrases(keywordSource))];
  const requirements = String(job.requirements ?? '').trim();
  const description = [job.description, job.responsibilities].filter(Boolean).join('\n');

  const parts: Array<{ weight: number; value: number }> = [];
  const keywordScore = coverage(hay, keywords);
  const reqScore = coverage(hay, uniqueTerms(requirements, 40));
  const descScore = coverage(hay, uniqueTerms(description, 40));

  if (keywordScore != null) parts.push({ weight: 0.5, value: keywordScore });
  if (reqScore != null) parts.push({ weight: 0.3, value: reqScore });
  if (descScore != null) parts.push({ weight: 0.2, value: descScore });

  if (!parts.length) {
    const fallback = uniqueTerms([keywordSource, requirements, description].join(' '), 50);
    const score = coverage(hay, fallback);
    return score == null ? 0 : Math.round(score * 100);
  }

  const weightSum = parts.reduce((sum, part) => sum + part.weight, 0);
  const weighted = parts.reduce((sum, part) => sum + part.value * part.weight, 0) / weightSum;
  return Math.round(Math.max(0, Math.min(100, weighted * 100)));
}

export function scoreResumeAgainstRequirements(resumeText: string, requirements: string): number {
  return computeAtsMatchScore(resumeText, {
    requirements,
    keywords: requirements,
  });
}
