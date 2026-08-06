'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  Home,
  Loader2,
  Menu,
  Newspaper,
  PenLine,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { createSeoBlogPost } from '@/app/actions/blogger-seo';
import { cn } from '@/lib/utils';

type NavDef = {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

/** All primary module routes — zero feature loss vs former hero pills. */
const ALL_NAV: NavDef[] = [
  { href: '/blogger', label: 'Overview', icon: Home, exact: true },
  { href: '/blogger/blogs', label: 'Blog Editor', icon: Newspaper },
  { href: '/blogger/seo', label: 'SEO Studio', icon: Search },
  { href: '/blogger/social-studio', label: 'Social Studio', icon: Share2 },
  { href: '/blogger/seo-guide', label: 'SEO Guide', icon: BookOpen },
  { href: '/blogger/settings', label: 'Settings', icon: Settings },
];

/** Mobile bar: Overview, Blog Editor, SEO + Create + More */
const MOBILE_PRIMARY = ALL_NAV.slice(0, 3);
const MOBILE_OVERFLOW = ALL_NAV.slice(3);

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
  onNavigate,
}: NavDef & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isNavActive(pathname, href, exact);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-semibold transition sm:text-[10px]',
        active ? 'text-[#F97316]' : 'text-neutral-500 dark:text-neutral-400'
      )}
    >
      <Icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
      <span className="truncate text-center leading-tight">{label}</span>
    </Link>
  );
}

export function BloggerBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const createRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
    setCreateOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!createOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!createRef.current?.contains(e.target as Node)) setCreateOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCreateOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [createOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const writeNewBlog = () => {
    setCreateOpen(false);
    setDrawerOpen(false);
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
      setCreateOpen(false);
      setDrawerOpen(false);
      router.push(`/blogger/seo/${result.post.id}`);
    });
  };

  const overflowActive = MOBILE_OVERFLOW.some((item) => isNavActive(pathname, item.href, item.exact));

  return (
    <>
      {/* Slide-to-left More drawer */}
      <div
        className={cn(
          'fixed inset-0 z-[60] transition-visibility',
          drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          aria-label="Close menu"
          className={cn(
            'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
            drawerOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={cn(
            'absolute inset-y-0 right-0 flex w-[min(100vw-3rem,20rem)] flex-col border-l border-neutral-800 bg-neutral-950/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out',
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          )}
          role="dialog"
          aria-modal="true"
          aria-label="More blogger modules"
        >
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F97316]">Blogger</p>
              <p className="text-sm font-bold text-white">More modules</p>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-full border border-neutral-700 p-2 text-neutral-300 hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {ALL_NAV.map((item) => {
              const active = isNavActive(pathname, item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition',
                    active
                      ? 'bg-[#F97316]/15 text-[#F97316]'
                      : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-800/80 bg-neutral-950/90 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md"
        aria-label="Blogger navigation"
      >
        {/* Desktop / tablet: full module set around Create */}
        <div className="relative mx-auto hidden max-w-xl items-end justify-between gap-1 px-3 md:flex">
          {ALL_NAV.slice(0, 2).map((item) => (
            <NavItem key={item.href} {...item} />
          ))}

          <CreateButton
            containerRef={createRef}
            open={createOpen}
            setOpen={setCreateOpen}
            pending={pending}
            error={error}
            onWriteBlog={writeNewBlog}
            onSeoDraft={newSeoDraft}
          />

          {ALL_NAV.slice(2).map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        {/* Mobile (< md): 3 primary + Create + More */}
        <div className="relative mx-auto flex max-w-lg items-end justify-between gap-0.5 px-2 md:hidden">
          {MOBILE_PRIMARY.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}

          <CreateButton
            containerRef={createRef}
            open={createOpen}
            setOpen={setCreateOpen}
            pending={pending}
            error={error}
            onWriteBlog={writeNewBlog}
            onSeoDraft={newSeoDraft}
          />

          <button
            type="button"
            onClick={() => {
              setCreateOpen(false);
              setDrawerOpen(true);
            }}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-semibold',
              overflowActive || drawerOpen ? 'text-[#F97316]' : 'text-neutral-500'
            )}
            aria-label="More modules"
            aria-expanded={drawerOpen}
          >
            <Menu size={18} strokeWidth={overflowActive || drawerOpen ? 2.5 : 2} />
            <span className="truncate text-center leading-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function CreateButton({
  containerRef,
  open,
  setOpen,
  pending,
  error,
  onWriteBlog,
  onSeoDraft,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  setOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  pending: boolean;
  error: string | null;
  onWriteBlog: () => void;
  onSeoDraft: () => void;
}) {
  return (
    <div ref={containerRef} className="relative flex w-[3.75rem] shrink-0 flex-col items-center justify-end sm:w-16">
      {open ? (
        <div
          className="absolute bottom-[calc(100%+0.65rem)] left-1/2 z-50 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950/95 shadow-xl backdrop-blur-md"
          role="menu"
        >
          <p className="border-b border-neutral-800 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F97316]">
            Quick Create
          </p>
          <button
            type="button"
            role="menuitem"
            onClick={onWriteBlog}
            className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-semibold text-white transition hover:bg-[#F97316]/10"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F97316]/15 text-[#F97316]">
              <PenLine size={16} />
            </span>
            Write New Blog
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={onSeoDraft}
            className="flex w-full items-center gap-3 border-t border-neutral-800 px-3 py-3 text-left text-sm font-semibold text-white transition hover:bg-[#F97316]/10 disabled:opacity-60"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F97316]/15 text-[#F97316]">
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            </span>
            New SEO Draft
          </button>
          {error ? (
            <p className="border-t border-red-500/20 px-3 py-2 text-[11px] text-red-400">{error}</p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        aria-label={open ? 'Close create menu' : 'Quick create'}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          '-mt-5 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg shadow-orange-500/30 transition hover:scale-105 active:scale-95',
          open ? 'bg-neutral-700' : 'bg-[#F97316] hover:bg-orange-600'
        )}
      >
        {open ? <X size={22} strokeWidth={2.5} /> : <Plus size={24} strokeWidth={2.5} />}
      </button>
      <span className="mt-0.5 text-[9px] font-bold text-[#F97316]">Create</span>
    </div>
  );
}
