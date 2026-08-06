import { normalizeTagList } from '@/lib/blog/tags';

export function BlogTags({ tags }: { tags: unknown }) {
  const list = normalizeTagList(tags);
  if (!list.length) return null;

  return (
    <div className="mt-10 border-t border-neutral-800 pt-8">
      <p className="mb-3 text-sm font-semibold text-neutral-400">Related Tags:</p>
      <div className="flex flex-wrap">
        {list.map((tag) => (
          <span
            key={tag}
            className="mb-2 mr-2 inline-block rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400 transition-colors hover:bg-orange-500/20"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
