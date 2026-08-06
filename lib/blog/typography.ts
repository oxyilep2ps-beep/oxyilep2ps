/**
 * Normalises historical and new blog bodies so H1–H6 + paragraph gaps render
 * without requiring database rewrites.
 */
export function normalizeBlogHtml(raw: string): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';

  // TipTap / rich HTML already contains block tags — leave structure intact.
  if (/<(p|h[1-6]|ul|ol|li|div|blockquote|pre|table|section|article|br)\b/i.test(trimmed)) {
    return trimmed;
  }

  const escape = (value: string) =>
    value
      .split('&')
      .join('&amp;')
      .split('<')
      .join('&lt;')
      .split('>')
      .join('&gt;');

  return trimmed
    .split(/\n{2,}/)
    .map((block) => {
      const text = block.trim();
      if (!text) return '';

      const heading = text.match(/^(#{1,6})\s+([\s\S]+)$/);
      if (heading) {
        const level = Math.min(6, heading[1].length);
        return `<h${level}>${escape(heading[2].replace(/\n/g, ' ').trim())}</h${level}>`;
      }

      return `<p>${escape(text).split(/\n/).join('<br />')}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

export const BLOG_PROSE_CLASS =
  'blog-prose prose prose-invert prose-orange max-w-none ' +
  'prose-headings:font-bold prose-headings:text-white prose-headings:tracking-tight ' +
  'prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4 ' +
  'prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3 ' +
  'prose-h3:text-xl prose-h3:mt-5 prose-h3:mb-2 ' +
  'prose-h4:text-lg prose-h4:mt-4 prose-h4:mb-2 ' +
  'prose-h5:text-base prose-h5:mt-4 prose-h5:mb-2 ' +
  'prose-h6:text-sm prose-h6:mt-3 prose-h6:mb-2 ' +
  'prose-p:leading-relaxed prose-p:my-5 prose-p:text-neutral-300 ' +
  'prose-li:text-neutral-300 prose-strong:text-white ' +
  'prose-a:text-[#F97316] prose-a:no-underline hover:prose-a:underline ' +
  'prose-img:rounded-2xl prose-hr:border-neutral-800';
