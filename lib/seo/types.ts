export type BlogPostStatus = 'draft' | 'review' | 'published' | 'archived';
export type BlogContentType = 'evergreen' | 'trending' | 'news';

export type BlogPostRow = {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  content: string;
  meta_description: string;
  focus_keyword: string;
  cover_image_url: string | null;
  cover_alt_text: string | null;
  status: BlogPostStatus;
  content_type: BlogContentType;
  category?: string | null;
  tags?: string[] | null;
  share_linkedin?: boolean | null;
  share_instagram?: boolean | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SeoMetricsRow = {
  id?: string;
  post_id: string;
  readability_score: number;
  keyword_density: number;
  focus_keyword: string;
  content_score: number;
  title_score: number;
  meta_score: number;
  heading_score: number;
  link_score: number;
  voice_search_score: number;
  trust_score: number;
  predicted_ctr: number;
  read_time_minutes: number;
  checklist: Record<string, unknown>;
  updated_at?: string;
};

export type KeywordResearchRow = {
  id: string;
  author_id: string | null;
  keyword: string;
  search_volume: number;
  competition_level: 'low' | 'medium' | 'high';
  long_tail_suggestions: string[];
  lsi_keywords: string[];
  niche: string;
  created_at: string;
  updated_at: string;
};

export type CompetitorAnalysisRow = {
  id: string;
  post_id: string | null;
  author_id: string;
  keyword: string;
  competitor_urls: { url: string; title: string; strength?: string }[];
  content_gaps: string[];
  created_at: string;
  updated_at: string;
};
