'use server';

import { revalidatePath } from 'next/cache';
import { assertBloggerOrAdmin } from '@/lib/auth/assert-blogger';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { analyzeSeoContent, mockCompetitorGaps, mockLongTailAndLsi, slugifySeo } from '@/lib/seo/engine';
import type {
  BlogPostRow,
  CompetitorAnalysisRow,
  KeywordResearchRow,
  SeoMetricsRow,
} from '@/lib/seo/types';

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v));
}

export async function listSeoBlogPosts(): Promise<BlogPostRow[]> {
  const user = await assertBloggerOrAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('author_id', user.id)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as BlogPostRow[];
}

export async function getSeoBlogPost(postId: string): Promise<BlogPostRow | null> {
  const user = await assertBloggerOrAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', postId)
    .eq('author_id', user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as BlogPostRow | null) ?? null;
}

export async function createSeoBlogPost(input?: {
  title?: string;
  focusKeyword?: string;
}): Promise<{ ok: true; post: BlogPostRow } | { ok: false; error: string }> {
  try {
    const user = await assertBloggerOrAdmin();
    const supabase = await createClient();
    const title = input?.title?.trim() || 'Untitled SEO draft';
    const focus = input?.focusKeyword?.trim() || '';
    const slug = `${slugifySeo(title) || 'draft'}-${Date.now().toString(36)}`;

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        author_id: user.id,
        title,
        slug,
        content: '<p></p>',
        focus_keyword: focus,
        status: 'draft',
        content_type: 'evergreen',
      })
      .select('*')
      .single();

    if (error) return { ok: false, error: error.message };

    await supabase.from('seo_metrics').upsert({
      post_id: data.id,
      focus_keyword: focus,
      checklist: {},
    });

    revalidatePath('/blogger/seo');
    return { ok: true, post: data as BlogPostRow };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not create post' };
  }
}

export async function saveSeoBlogPost(input: {
  id: string;
  title: string;
  slug: string;
  content: string;
  metaDescription: string;
  focusKeyword: string;
  coverImageUrl?: string | null;
  coverAltText?: string | null;
  status?: BlogPostRow['status'];
  contentType?: BlogPostRow['content_type'];
  category?: string | null;
  tags?: string[];
  shareLinkedin?: boolean;
  shareInstagram?: boolean;
  coverImageAlt?: string | null;
  socialCaption?: string | null;
  autoShareSocials?: boolean;
  /** ISO timestamp — historical backdating allowed (writes published_at + created_at). */
  publishAt?: string | null;
}): Promise<{ ok: true; post: BlogPostRow; metrics: SeoMetricsRow } | { ok: false; error: string }> {
  try {
    const user = await assertBloggerOrAdmin();
    const supabase = await createClient();
    const analysis = analyzeSeoContent({
      title: input.title,
      metaDescription: input.metaDescription,
      html: input.content,
      focusKeyword: input.focusKeyword,
      slug: input.slug,
    });

    const nextStatus = input.status ?? 'draft';
    const backdate =
      input.publishAt && !Number.isNaN(new Date(input.publishAt).getTime())
        ? new Date(input.publishAt).toISOString()
        : null;
    const publishedAt =
      nextStatus === 'published' || nextStatus === 'review'
        ? backdate ?? new Date().toISOString()
        : backdate;

    const autoShare =
      input.autoShareSocials !== undefined
        ? Boolean(input.autoShareSocials)
        : Boolean(input.shareLinkedin || input.shareInstagram);

    const updatePayload: Record<string, unknown> = {
      title: input.title,
      slug: input.slug || slugifySeo(input.title),
      content: input.content,
      meta_description: input.metaDescription,
      focus_keyword: input.focusKeyword,
      cover_image_url: input.coverImageUrl ?? null,
      cover_alt_text: input.coverAltText ?? input.coverImageAlt ?? null,
      cover_image_alt: input.coverImageAlt ?? input.coverAltText ?? null,
      social_caption: input.socialCaption?.trim() || null,
      auto_share_socials: autoShare,
      status: nextStatus,
      content_type: input.contentType ?? analysis.contentType,
      category: input.category?.trim() || 'FinTech',
      tags: input.tags ?? [],
      share_linkedin: Boolean(input.shareLinkedin ?? autoShare),
      share_instagram: Boolean(input.shareInstagram ?? autoShare),
      published_at: publishedAt,
    };

    // Historical ordering: when a custom publish date is chosen, also bind created_at.
    if (backdate) {
      updatePayload.created_at = backdate;
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .update(updatePayload)
      .eq('id', input.id)
      .eq('author_id', user.id)
      .select('*')
      .single();

    if (error) return { ok: false, error: error.message };

    const metricsPayload = {
      post_id: input.id,
      readability_score: analysis.readabilityScore,
      keyword_density: analysis.keywordDensity,
      focus_keyword: input.focusKeyword,
      content_score: analysis.contentScore,
      title_score: analysis.titleScore,
      meta_score: analysis.metaScore,
      heading_score: analysis.headingScore,
      link_score: analysis.linkScore,
      voice_search_score: analysis.voiceSearchScore,
      trust_score: analysis.trustScore,
      predicted_ctr: analysis.predictedCtr,
      read_time_minutes: analysis.readTimeMinutes,
      checklist: { items: analysis.checklist, snippets: analysis.snippetCandidates },
    };

    const { data: metrics, error: metricsError } = await supabase
      .from('seo_metrics')
      .upsert(metricsPayload, { onConflict: 'post_id' })
      .select('*')
      .single();

    if (metricsError) return { ok: false, error: metricsError.message };

    revalidatePath('/blogger/seo');
    revalidatePath(`/blogger/seo/${input.id}`);
    return { ok: true, post: post as BlogPostRow, metrics: metrics as SeoMetricsRow };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Save failed' };
  }
}

export async function deleteSeoBlogPost(postId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await assertBloggerOrAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from('blog_posts').delete().eq('id', postId).eq('author_id', user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/blogger/seo');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Delete failed' };
  }
}

export async function listKeywordResearch(): Promise<KeywordResearchRow[]> {
  await assertBloggerOrAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('keyword_research')
    .select('*')
    .order('search_volume', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...(row as KeywordResearchRow),
    long_tail_suggestions: asStringArray((row as { long_tail_suggestions?: unknown }).long_tail_suggestions),
    lsi_keywords: asStringArray((row as { lsi_keywords?: unknown }).lsi_keywords),
  }));
}

export async function researchKeyword(keyword: string): Promise<{
  ok: true;
  row: KeywordResearchRow;
} | { ok: false; error: string }> {
  try {
    const user = await assertBloggerOrAdmin();
    const supabase = await createClient();
    const cleaned = keyword.trim().toLowerCase();
    if (!cleaned) return { ok: false, error: 'Enter a keyword' };

    const suggestions = mockLongTailAndLsi(cleaned);
    const volume = 400 + Math.round((cleaned.length * 137) % 7000);
    const competition =
      volume > 4000 ? 'high' : volume > 1500 ? 'medium' : ('low' as const);

    const { data, error } = await supabase
      .from('keyword_research')
      .upsert(
        {
          author_id: user.id,
          keyword: cleaned,
          search_volume: volume,
          competition_level: competition,
          long_tail_suggestions: suggestions.longTail,
          lsi_keywords: suggestions.lsi,
          niche: 'fintech',
        },
        { onConflict: 'keyword' }
      )
      .select('*')
      .single();

    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      row: {
        ...(data as KeywordResearchRow),
        long_tail_suggestions: suggestions.longTail,
        lsi_keywords: suggestions.lsi,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Research failed' };
  }
}

export async function runCompetitorAnalysis(input: {
  keyword: string;
  postId?: string;
}): Promise<{ ok: true; row: CompetitorAnalysisRow } | { ok: false; error: string }> {
  try {
    const user = await assertBloggerOrAdmin();
    const supabase = await createClient();
    const keyword = input.keyword.trim().toLowerCase();
    if (!keyword) return { ok: false, error: 'Enter a keyword' };

    const gaps = mockCompetitorGaps(keyword);
    const { data, error } = await supabase
      .from('competitor_analysis')
      .insert({
        author_id: user.id,
        post_id: input.postId ?? null,
        keyword,
        competitor_urls: gaps.competitor_urls,
        content_gaps: gaps.content_gaps,
      })
      .select('*')
      .single();

    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      row: {
        ...(data as CompetitorAnalysisRow),
        competitor_urls: gaps.competitor_urls,
        content_gaps: gaps.content_gaps,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Competitor analysis failed' };
  }
}

export async function checkKeywordCannibalization(focusKeyword: string, excludePostId?: string) {
  const user = await assertBloggerOrAdmin();
  const supabase = await createClient();
  const kw = focusKeyword.trim().toLowerCase();
  if (!kw) return [] as BlogPostRow[];

  let query = supabase
    .from('blog_posts')
    .select('*')
    .eq('author_id', user.id)
    .ilike('focus_keyword', kw);

  if (excludePostId) query = query.neq('id', excludePostId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as BlogPostRow[];
}

export async function listDecayingSeoPosts(): Promise<BlogPostRow[]> {
  const user = await assertBloggerOrAdmin();
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString();
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('author_id', user.id)
    .lt('updated_at', cutoff)
    .order('updated_at', { ascending: true })
    .limit(8);

  if (error) throw new Error(error.message);
  return (data ?? []) as BlogPostRow[];
}

/** Admin/service helper — seed is already in migration; no-op safe. */
export async function ensureSeoModuleReady(): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertBloggerOrAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from('keyword_research').select('id').limit(1);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'SEO module unavailable' };
  }
}
