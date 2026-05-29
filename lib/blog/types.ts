export const BLOG_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

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
  approved_at?: string | null;
  approved_by?: string | null;
};

export function blogCoverUrl(row: Pick<BlogRow, 'cover_image_url' | 'cover_image'>): string | null {
  return row.cover_image_url ?? row.cover_image ?? null;
}
