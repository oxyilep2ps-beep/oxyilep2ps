'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  CalendarDays,
  Home,
  Menu,
  Plus,
  Settings,
  Share2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavDef = {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
};

const ALL_NAV: NavDef[] = [
  { href: '/social', label: 'Overview', icon: Home, exact: true },
  { href: '/social/studio', label: 'Social Studio', icon: Share2 },
  { href: '/social/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/social/guide', label: 'Social Guide', icon: BookOpen },
  { href: '/social/settings', label: 'Settings', icon: Settings },
];

const MOBILE_PRIMARY = ALL_NAV.slice(0, 3);
const MOBILE_OVERFLOW = ALL_NAV.slice(3);

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact || href === '/social') return pathname === '/social' || pathname === '/social/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ href, label, icon: Icon, exact, onNavigate }: NavDef & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isNavActive(pathname, href, exact);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-semibold transition hover:bg-neutral-800/60 sm:text-[10px]',
        active ? 'text-orange-500' : 'text-neutral-500'
      )}
    >
      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
      <span className="truncate text-center leading-tight">{label}</span>
    </Link>
  );
}

export function SocialBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const overflowActive = MOBILE_OVERFLOW.some((item) => isNavActive(pathname, item.href, item.exact));

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

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

  return (
    <>
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
            'absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300',
            drawerOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={cn(
            'absolute inset-y-0 right-0 flex w-[min(100vw-3rem,20rem)] flex-col border-l border-neutral-800 bg-[#0A0A0A]/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out',
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          )}
          role="dialog"
          aria-modal="true"
          aria-label="More social modules"
        >
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Social</p>
              <p className="text-sm font-bold text-white">More modules</p>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-full border border-neutral-700 p-2 text-neutral-300 hover:bg-neutral-800/60"
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
                      ? 'bg-orange-500/15 text-orange-500'
                      : 'text-neutral-300 hover:bg-neutral-800/60 hover:text-white'
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
        className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-800/80 bg-[#0A0A0A]/95 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md"
        aria-label="Social Manager navigation"
      >
        <div className="relative mx-auto hidden max-w-xl items-end justify-between gap-1 px-3 md:flex">
          {ALL_NAV.slice(0, 2).map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
          <div className="relative flex w-[3.75rem] shrink-0 flex-col items-center justify-end">
            <button
              type="button"
              onClick={() => router.push('/social/studio?new=1')}
              className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 transition hover:scale-105 active:scale-95"
              aria-label="Create Campaign"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>
            <span className="mt-0.5 text-[9px] font-bold text-orange-500">Create</span>
          </div>
          {ALL_NAV.slice(2).map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        <div className="relative mx-auto flex max-w-lg items-end justify-between gap-0.5 px-2 md:hidden">
          {MOBILE_PRIMARY.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
          <div className="relative flex w-[3.5rem] shrink-0 flex-col items-center justify-end">
            <button
              type="button"
              onClick={() => router.push('/social/studio?new=1')}
              className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30"
              aria-label="Create Campaign"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>
            <span className="mt-0.5 text-[9px] font-bold text-orange-500">Create</span>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-semibold hover:bg-neutral-800/60',
              overflowActive || drawerOpen ? 'text-orange-500' : 'text-neutral-500'
            )}
            aria-label="More modules"
          >
            <Menu size={18} strokeWidth={overflowActive || drawerOpen ? 2.5 : 2} />
            <span className="truncate text-center leading-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
