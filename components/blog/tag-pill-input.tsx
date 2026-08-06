'use client';

import { KeyboardEvent, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type TagPillInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function normalizeTagList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((t) => t.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

/** YouTube-style comma-to-pill tag creator. */
export function TagPillInput({
  tags,
  onChange,
  placeholder = 'FinTech, Lending, UK',
  className,
}: TagPillInputProps) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const next = raw.trim().replace(/,$/, '').trim();
    if (!next) return;
    const exists = tags.some((t) => t.toLowerCase() === next.toLowerCase());
    if (!exists) onChange([...tags, next]);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(draft);
      return;
    }
    if (e.key === 'Backspace' && !draft && tags.length) {
      e.preventDefault();
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div>
      <div
        className={cn(
          'flex min-h-[46px] flex-wrap items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 focus-within:border-[#F97316]/50',
          className
        )}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-[#F97316]/15 px-2.5 py-1 text-xs font-bold text-[#F97316] ring-1 ring-[#F97316]/30"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="rounded-full p-0.5 hover:bg-[#F97316]/20"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => {
            const value = e.target.value;
            if (value.includes(',')) {
              const [before, ...rest] = value.split(',');
              commit(before ?? '');
              setDraft(rest.join(',').trimStart());
              return;
            }
            setDraft(value);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) commit(draft);
          }}
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm text-white outline-none placeholder:text-neutral-600"
          placeholder={tags.length ? 'Add another…' : placeholder}
        />
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Use commas (`,`) to separate tags (e.g., FinTech, Lending, UK). Pressing comma automatically creates a tag
        pill.
      </p>
    </div>
  );
}
