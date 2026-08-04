export const BLOG_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export const BLOG_REJECTION_REASONS = [
  'Plagiarism',
  'Formatting',
  'Poor SEO',
  'Tone',
  'Accuracy',
  'Other',
] as const;
export type BlogRejectionReason = (typeof BLOG_REJECTION_REASONS)[number];

export type BlogRow = {
  id: string;
  title: string;
  slug: string;
  content: string;
  cover_image_url: string | null;
  cover_image?: string | null;
  author_id: string | null;
  status: BlogStatus;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  category?: string | null;
  tags?: string[] | null;
  share_linkedin?: boolean | null;
  share_instagram?: boolean | null;
  cover_image_alt?: string | null;
  social_caption?: string | null;
  auto_share_socials?: boolean | null;
  social_share_status?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  admin_feedback?: string | null;
  rejection_reason?: string | null;
  inline_images?: string[] | null;
};

export function blogCoverUrl(row: Pick<BlogRow, 'cover_image_url' | 'cover_image'>): string | null {
  return row.cover_image_url ?? row.cover_image ?? null;
}
