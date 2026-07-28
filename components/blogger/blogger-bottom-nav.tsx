'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  Home,
  Loader2,
  Newspaper,
  PenLine,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { createSeoBlogPost } from '@/app/actions/blogger-seo';
import { cn } from '@/lib/utils';

const leftItems = [
  { href: '/blogger', label: 'Overview', icon: Home, exact: true },
  { href: '/blogger/blogs', label: 'Blog Editor', icon: Newspaper, exact: false },
] as const;

const rightItems = [
  { href: '/blogger/seo', label: 'SEO Studio', icon: Search, exact: false },
  { href: '/blogger/seo-guide', label: 'SEO Guide', icon: BookOpen, exact: false },
  { href: '/blogger/settings', label: 'Settings', icon: Settings, exact: false },
] as const;

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact || href === '/blogger') {
    return pathname === '/blogger' || pathname === '/blogger/';
  }
  if (href === '/blogger/seo') {
    return pathname === '/blogger/seo' || pathname.startsWith('/blogger/seo/');
  }
  if (href === '/blogger/blogs') {
    return pathname === '/blogger/blogs' || pathname.startsWith('/blogger/blogs/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = isNavActive(pathname, href, exact);

  return (
    <Link
      href={href}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-semibold transition sm:text-[10px]',
        active ? 'text-brand-500' : 'text-neutral-500 dark:text-neutral-400'
      )}
    >
      <Icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
      <span className="truncate text-center leading-tight">{label}</span>
    </Link>
  );
}

export function BloggerBottomNav() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const writeNewBlog = () => {
    setMenuOpen(false);
    router.push('/blogger?new=1');
  };

  const newSeoDraft = () => {
    setError(null);
    startTransition(async () => {
      const result = await createSeoBlogPost({ title: 'Untitled SEO draft' });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMenuOpen(false);
      router.push(`/blogger/seo/${result.post.id}`);
    });
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/20 bg-white/75 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md dark:border-white/10 dark:bg-white/10"
      aria-label="Blogger navigation"
    >
      <div className="relative mx-auto flex max-w-lg items-end justify-between gap-0.5 px-2 sm:max-w-xl sm:gap-1 sm:px-3">
        {leftItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        {/* Central Quick Create */}
        <div ref={menuRef} className="relative flex w-[3.75rem] shrink-0 flex-col items-center justify-end sm:w-16">
          {menuOpen ? (
            <div
              className="absolute bottom-[calc(100%+0.65rem)] left-1/2 z-50 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/40 bg-white/95 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/95"
              role="menu"
            >
              <p className="border-b border-black/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-brand-500 dark:border-white/10">
                Quick Create
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={writeNewBlog}
                className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-semibold text-neutral-900 transition hover:bg-brand-500/10 dark:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-brand-600">
                  <PenLine size={16} />
                </span>
                Write New Blog
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                onClick={newSeoDraft}
                className="flex w-full items-center gap-3 border-t border-black/5 px-3 py-3 text-left text-sm font-semibold text-neutral-900 transition hover:bg-brand-500/10 disabled:opacity-60 dark:border-white/10 dark:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-brand-600">
                  {pending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                </span>
                New SEO Draft
              </button>
              {error ? (
                <p className="border-t border-red-500/20 px-3 py-2 text-[11px] text-red-600 dark:text-red-400">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            aria-label={menuOpen ? 'Close create menu' : 'Quick create'}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              '-mt-5 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg shadow-orange-500/30 transition hover:scale-105 active:scale-95',
              menuOpen ? 'bg-neutral-800 dark:bg-neutral-200 dark:text-neutral-900' : 'bg-orange-500 hover:bg-orange-600'
            )}
          >
            {menuOpen ? <X size={22} strokeWidth={2.5} /> : <Plus size={24} strokeWidth={2.5} />}
          </button>
          <span className="mt-0.5 text-[9px] font-bold text-orange-600 dark:text-orange-400">Create</span>
        </div>

        {rightItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>
    </nav>
  );
}
