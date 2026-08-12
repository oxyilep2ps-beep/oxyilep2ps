'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ClipboardList,
  Coins,
  FileText,
  Heart,
  Home,
  Laptop,
  Menu,
  PoundSterling,
  TreePalm,
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
  { href: '/employee/dashboard', label: 'Dashboard', icon: Home, exact: true },
  { href: '/employee/dashboard/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/employee/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/employee/dashboard/hr', label: 'HR & Leaves', icon: TreePalm },
  { href: '/employee/dashboard/assets', label: 'Assets', icon: Laptop },
  { href: '/employee/dashboard/finances', label: 'Finances', icon: PoundSterling },
  { href: '/employee/dashboard/culture', label: 'Culture', icon: Heart },
  { href: '/employee/dashboard/rewards', label: 'OxyCoins', icon: Coins },
];

const MOBILE_PRIMARY = ALL_NAV.slice(0, 3);
const MOBILE_OVERFLOW = ALL_NAV.slice(3);

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact || href === '/employee/dashboard') {
    return pathname === '/employee/dashboard' || pathname === '/employee/dashboard/';
  }
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

export function EmployeeBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
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
      {drawerOpen ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col border-l border-neutral-800 bg-[#0A0A0A] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">Modules</p>
              <button type="button" onClick={() => setDrawerOpen(false)} className="text-neutral-400">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1 overflow-y-auto">
              {ALL_NAV.map((item) => {
                const active = isNavActive(pathname, item.href, item.exact);
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      router.push(item.href);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition',
                      active
                        ? 'bg-orange-500/15 text-orange-400'
                        : 'text-neutral-300 hover:bg-neutral-900'
                    )}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-800/80 bg-[#080808]/95 px-2 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-stretch gap-1">
          {MOBILE_PRIMARY.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-semibold sm:text-[10px]',
              overflowActive ? 'text-orange-500' : 'text-neutral-500'
            )}
          >
            <Menu size={18} />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
