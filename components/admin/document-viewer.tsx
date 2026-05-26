'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, FileText, Image as ImageIcon, Loader2, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ReviewDocument = {
  label: string;
  path?: string | null;
};

interface DocumentViewerProps {
  documents: ReviewDocument[];
  resolveUrl: (path: string) => Promise<string>;
}

type LoadedDocument = ReviewDocument & {
  url?: string;
  loaded: boolean;
  error?: string;
};

function getFileName(path?: string | null, label?: string): string {
  if (!path) return label ?? 'Document';
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? label ?? 'Document';
}

function getKind(path?: string | null): 'image' | 'pdf' | 'video' | 'other' {
  if (!path) return 'other';
  const lower = path.toLowerCase();
  if (/(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/.test(lower)) return 'image';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (/(\.mp4|\.webm|\.mov)$/.test(lower)) return 'video';
  return 'other';
}

function thumbnailIcon(kind: ReturnType<typeof getKind>) {
  if (kind === 'image') return <ImageIcon size={18} />;
  if (kind === 'video') return <Play size={18} />;
  return <FileText size={18} />;
}

export function DocumentViewer({ documents, resolveUrl }: DocumentViewerProps) {
  const [items, setItems] = useState<LoadedDocument[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    setItems(documents.map((doc) => ({ ...doc, loaded: !doc.path })));

    documents.forEach(async (doc, index) => {
      if (!doc.path) return;
      try {
        const url = await resolveUrl(doc.path);
        if (cancelled) return;
        setItems((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index ? { ...item, url, loaded: true, error: undefined } : item
          )
        );
      } catch {
        if (cancelled) return;
        setItems((current) =>
          current.map((item, itemIndex) =>
            itemIndex === index ? { ...item, loaded: true, error: 'Could not load preview' } : item
          )
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [documents, resolveUrl]);

  const activeDocument = activeIndex !== null ? items[activeIndex] : null;
  const activeKind = useMemo(() => getKind(activeDocument?.path), [activeDocument?.path]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => {
          const kind = getKind(item.path);
          const fileName = getFileName(item.path, item.label);

          return (
            <button
              key={`${item.label}-${item.path ?? index}`}
              type="button"
              disabled={!item.loaded || !item.url}
              onClick={() => setActiveIndex(index)}
              className="group overflow-hidden rounded-2xl border border-white/60 bg-white/70 text-left shadow-[0_14px_40px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[0_18px_50px_rgba(255,90,31,0.12)] disabled:cursor-not-allowed disabled:opacity-75 dark:border-white/10 dark:bg-black/40"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-white/5">
                {!item.loaded ? (
                  <div className="absolute inset-0 grid place-items-center text-brand-500">
                    <Loader2 className="animate-spin" size={20} />
                  </div>
                ) : !item.path ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 text-neutral-500 dark:bg-white/5">
                    <div className="rounded-2xl border border-white/40 bg-white/80 p-3 text-neutral-400 dark:bg-white/5">
                      {thumbnailIcon(kind)}
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.24em]">
                      Not provided
                    </span>
                  </div>
                ) : item.url && kind === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={fileName} className="h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_center,rgba(255,90,31,0.16),transparent_60%)] text-neutral-950 dark:text-white">
                    <div className="rounded-2xl border border-white/40 bg-black/80 p-3 text-brand-300 shadow-glow dark:bg-white/5">
                      {thumbnailIcon(kind)}
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:text-white/60">
                      Preview
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1 p-4">
                <p className="text-sm font-semibold text-neutral-950 dark:text-white">{item.label}</p>
                <p className="truncate text-xs text-neutral-500 dark:text-white/55">{fileName}</p>
                <p className={cn('text-[10px] font-bold uppercase tracking-[0.22em]', item.error ? 'text-red-500' : 'text-brand-500')}>
                  {item.error ?? (!item.path ? 'Not provided' : item.loaded ? 'Tap to open' : 'Loading…')}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {activeDocument && activeDocument.url && activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/92 p-3 backdrop-blur-xl sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.96, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 18 }}
              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#080808] shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-500">Document Viewer</p>
                  <h3 className="mt-1 text-lg font-bold text-white">{activeDocument.label}</h3>
                  <p className="text-xs text-white/55">{getFileName(activeDocument.path, activeDocument.label)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={activeDocument.url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
                  >
                    <Download size={16} />
                    {activeKind === 'image' ? 'Download Image' : 'Download File'}
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveIndex(null)}
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                    aria-label="Close document viewer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-[radial-gradient(circle_at_center,rgba(255,90,31,0.12),transparent_48%)] p-3 sm:p-6">
                <div className="flex h-full items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/70 p-3 sm:p-5">
                  {activeKind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeDocument.url}
                      alt={activeDocument.label}
                      className="max-h-full max-w-full rounded-[1.1rem] object-contain shadow-2xl"
                    />
                  ) : activeKind === 'pdf' ? (
                    <iframe
                      src={activeDocument.url}
                      title={activeDocument.label}
                      className="h-full w-full rounded-[1.1rem] border border-white/10 bg-white"
                    />
                  ) : activeKind === 'video' ? (
                    <video
                      src={activeDocument.url}
                      controls
                      className="max-h-full max-w-full rounded-[1.1rem] border border-white/10 bg-black shadow-2xl"
                    />
                  ) : (
                    <div className="max-w-lg rounded-[1.5rem] border border-white/10 bg-white/5 p-8 text-center text-white/75">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
                        <FileText size={24} />
                      </div>
                      <p className="text-lg font-semibold text-white">Preview not available</p>
                      <p className="mt-2 text-sm text-white/60">
                        Use the download button to inspect the original file.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
