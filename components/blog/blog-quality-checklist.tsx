'use client';

type BlogQualityChecklistProps = {
  title: string;
  content: string;
  coverImage: string | null;
};

export type BlogQualityStatus = {
  titleLength: boolean;
  wordCount: boolean;
  hasHeading: boolean;
  hasCoverImage: boolean;
  allGreen: boolean;
  words: number;
};

function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function evaluateBlogQuality(title: string, content: string, coverImage: string | null): BlogQualityStatus {
  const titleWords = title.trim().split(/\s+/).filter(Boolean).length;
  const plainText = stripHtml(content);
  const words = getWordCount(plainText);
  const hasHeading = /<h1[\s>]|<h2[\s>]/i.test(content);
  const hasCoverImage = Boolean(coverImage);
  const titleLength = titleWords > 5;
  const wordCount = words > 300;
  const allGreen = titleLength && wordCount && hasHeading && hasCoverImage;

  return { titleLength, wordCount, hasHeading, hasCoverImage, allGreen, words };
}

export function BlogQualityChecklist({ title, content, coverImage }: BlogQualityChecklistProps) {
  const quality = evaluateBlogQuality(title, content, coverImage);
  const itemClass = 'flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm';

  return (
    <aside className="glass-card rounded-2xl p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Perfect Blog Checklist</p>
      <div className="mt-3 space-y-2">
        <div className={`${itemClass} ${quality.titleLength ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-red-400/40 bg-red-500/10'}`}>
          <span>Title length &gt; 5 words</span>
          <span>{quality.titleLength ? '🟢 Perfect' : '🔴 Needs Work'}</span>
        </div>
        <div className={`${itemClass} ${quality.wordCount ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-red-400/40 bg-red-500/10'}`}>
          <span>Body text &gt; 300 words ({quality.words})</span>
          <span>{quality.wordCount ? '🟢 Perfect' : '🔴 Needs Work'}</span>
        </div>
        <div className={`${itemClass} ${quality.hasHeading ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-red-400/40 bg-red-500/10'}`}>
          <span>Contains heading (H1/H2)</span>
          <span>{quality.hasHeading ? '🟢 Perfect' : '🔴 Needs Work'}</span>
        </div>
        <div className={`${itemClass} ${quality.hasCoverImage ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-red-400/40 bg-red-500/10'}`}>
          <span>Cover image uploaded</span>
          <span>{quality.hasCoverImage ? '🟢 Perfect' : '🔴 Needs Work'}</span>
        </div>
      </div>
    </aside>
  );
}
