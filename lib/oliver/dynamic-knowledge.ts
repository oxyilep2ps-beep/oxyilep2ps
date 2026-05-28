export type DynamicKnowledgeEntry = {
  keyword_string: string;
  answer_text: string;
};

let cache: { entries: DynamicKnowledgeEntry[]; at: number } | null = null;
const TTL_MS = 60_000;

export async function fetchDynamicKnowledge(): Promise<DynamicKnowledgeEntry[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.entries;
  try {
    const res = await fetch('/api/oliver/knowledge', { cache: 'no-store' });
    const body = (await res.json()) as { entries?: DynamicKnowledgeEntry[] };
    const entries = body.entries ?? [];
    cache = { entries, at: Date.now() };
    return entries;
  } catch {
    return [];
  }
}

export function matchDynamicKnowledge(
  query: string,
  entries: DynamicKnowledgeEntry[]
): string | null {
  const lower = query.toLowerCase();
  for (const entry of entries) {
    const keywords = entry.keyword_string
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    if (keywords.some((kw) => lower.includes(kw))) {
      return entry.answer_text;
    }
  }
  return null;
}
