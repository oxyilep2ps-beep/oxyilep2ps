import { BLOG_PROSE_CLASS, normalizeBlogHtml } from '@/lib/blog/typography';
import { cn } from '@/lib/utils';

type BlogContentProps = {
  html: string;
  className?: string;
};

/**
 * Universal blog body renderer — applies Tailwind Typography for H1–H6 +
 * paragraph spacing on both historical plaintext and rich HTML posts.
 */
export function BlogContent({ html, className }: BlogContentProps) {
  const normalized = normalizeBlogHtml(html);

  return (
    <div
      className={cn(BLOG_PROSE_CLASS, 'mt-10', className)}
      dangerouslySetInnerHTML={{ __html: normalized }}
    />
  );
}
