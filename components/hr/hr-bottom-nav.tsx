'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  FileSpreadsheet,
  Gauge,
  GraduationCap,
  Home,
  Menu,
  Newspaper,
  Plus,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useHrJobEditor } from '@/components/hr/hr-job-editor-provider';
import { cn } from '@/lib/utils';

type NavDef = {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  /** Short label for the compact bottom bar */
  shortLabel?: string;
};

/**
 * Exhaustive HR module catalogue for the More drawer.
 * Covers every former hero pill plus Learning / Blogs — zero feature loss.
 */
const DRAWER_NAV: NavDef[] = [
  { href: '/hr', label: 'Overview', icon: Home, exact: true },
  { href: '/hr/recruitment', label: 'ATS / Recruitment', icon: BriefcaseBusiness },
  { href: '/hr/employees', label: 'Employees & Leaves', icon: Users },
  { href: '/hr/payroll', label: 'Payroll £ (PAYE / NI)', icon: Wallet },
  { href: '/hr/employees', label: 'DBS & Compliance', icon: ShieldCheck },
  { href: '/hr/attendance', label: 'Attendance', icon: CalendarDays },
  { href: '/hr/performance', label: 'Performance', icon: Gauge },
  { href: '/hr/guide', label: 'HR Guide', icon: BookOpen },
  { href: '/hr/learning', label: 'Learning Hub', icon: GraduationCap },
  { href: '/hr/blogs', label: 'HR Blogs', icon: Newspaper },
  { href: '/hr/settings', label: 'Settings', icon: Settings },
];

const MOBILE_PRIMARY: NavDef[] = [
  { href: '/hr', label: 'Overview', shortLabel: 'Overview', icon: Home, exact: true },
  { href: '/hr/recruitment', label: 'ATS', shortLabel: 'ATS', icon: BriefcaseBusiness },
  { href: '/hr/employees', label: 'People', shortLabel: 'People', icon: Users },
];

const DESKTOP_LEFT: NavDef[] = [
  { href: '/hr', label: 'Overview', shortLabel: 'Overview', icon: Home, exact: true },
  { href: '/hr/recruitment', label: 'ATS', shortLabel: 'ATS', icon: BriefcaseBusiness },
  { href: '/hr/employees', label: 'People', shortLabel: 'People', icon: Users },
];

const DESKTOP_RIGHT: NavDef[] = [
  { href: '/hr/payroll', label: 'Payroll £', shortLabel: 'Payroll £', icon: Wallet },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact || href === '/hr') return pathname === '/hr' || pathname === '/hr/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  shortLabel,
  icon: Icon,
  exact,
  onNavigate,
}: NavDef & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, href, exact);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[8px] font-semibold sm:text-[9px]',
        active ? 'text-[#F97316]' : 'text-neutral-500'
      )}
    >
      <Icon size={17} strokeWidth={active ? 2.5 : 2} />
      <span className="truncate text-center leading-tight">{shortLabel ?? label}</span>
    </Link>
  );
}

export function HrBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { openCreateJob } = useHrJobEditor();
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPtr = (e: MouseEvent | TouchEvent) => {
      if (!createRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPtr);
    return () => document.removeEventListener('mousedown', onPtr);
  }, [open]);

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

  const primaryHrefs = useMemo(
    () => new Set([...MOBILE_PRIMARY, ...DESKTOP_LEFT, ...DESKTOP_RIGHT].map((item) => item.href)),
    []
  );
  const overflowActive = DRAWER_NAV.some(
    (item) => !primaryHrefs.has(item.href) && isActive(pathname, item.href, item.exact)
  );

  return (
    <>
      {/* Slide-to-left More drawer — full module catalogue */}
      <div
        className={cn('fixed inset-0 z-[60]', drawerOpen ? 'pointer-events-auto' : 'pointer-events-none')}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          aria-label="Close menu"
          className={cn(
            'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/60',
            drawerOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={cn(
            'absolute inset-y-0 right-0 flex w-[min(100vw-3rem,22rem)] flex-col border-l border-gray-200 bg-white/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out dark:border-neutral-800 dark:bg-neutral-950/95',
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          )}
          role="dialog"
          aria-modal="true"
          aria-label="More HR modules"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-neutral-800">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F97316]">HR Portal</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">All modules</p>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-full border border-gray-200 p-2 text-neutral-600 hover:text-gray-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {DRAWER_NAV.map((item, index) => {
              const active = isActive(pathname, item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={`${item.href}-${item.label}-${index}`}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition',
                    active
                      ? 'bg-[#F97316]/15 text-[#F97316]'
                      : 'text-neutral-600 hover:bg-gray-100 hover:text-gray-900 dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-white'
                  )}
                >
                  <Icon size={18} className="shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-3 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                setOpen(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#F97316] px-4 py-2.5 text-sm font-bold text-white"
            >
              <Plus size={16} /> Quick Create
            </button>
          </div>
        </aside>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/90 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-950/90"
        aria-label="HR navigation"
      >
        {/* Desktop: Overview · ATS · People · + · Payroll · DBS · More */}
        <div className="relative mx-auto hidden max-w-2xl items-end justify-between gap-0.5 px-2 md:flex">
          {DESKTOP_LEFT.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          <CreateFab
            createRef={createRef}
            open={open}
            setOpen={setOpen}
            router={router}
            onPostJob={openCreateJob}
          />

          {DESKTOP_RIGHT.map((item) => (
            <NavLink key={`${item.href}-${item.shortLabel}`} {...item} />
          ))}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setDrawerOpen(true);
            }}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[8px] font-semibold sm:text-[9px]',
              drawerOpen || overflowActive ? 'text-[#F97316]' : 'text-neutral-500'
            )}
            aria-label="More modules"
            aria-expanded={drawerOpen}
          >
            <Menu size={17} strokeWidth={drawerOpen || overflowActive ? 2.5 : 2} />
            <span className="truncate text-center leading-tight">More</span>
          </button>
        </div>

        {/* Mobile: Overview · ATS · People · + · More */}
        <div className="relative mx-auto flex max-w-lg items-end justify-between gap-0.5 px-1.5 md:hidden">
          {MOBILE_PRIMARY.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          <CreateFab
            createRef={createRef}
            open={open}
            setOpen={setOpen}
            router={router}
            onPostJob={openCreateJob}
          />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setDrawerOpen(true);
            }}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[8px] font-semibold',
              drawerOpen || overflowActive ? 'text-[#F97316]' : 'text-neutral-500'
            )}
            aria-label="More modules"
            aria-expanded={drawerOpen}
          >
            <Menu size={17} strokeWidth={drawerOpen || overflowActive ? 2.5 : 2} />
            <span className="truncate text-center leading-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function closeAndGo(
  setOpen: (v: boolean) => void,
  router: ReturnType<typeof useRouter>,
  href: string
) {
  setOpen(false);
  router.push(href);
}

function CreateFab({
  createRef,
  open,
  setOpen,
  router,
  onPostJob,
}: {
  createRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  setOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  router: ReturnType<typeof useRouter>;
  onPostJob: () => void;
}) {
  return (
    <div ref={createRef} className="relative flex w-14 shrink-0 flex-col items-center sm:w-16">
      {open ? (
        <div className="absolute bottom-[calc(100%+0.65rem)] left-1/2 z-50 w-[min(92vw,20rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-black">
          <p className="border-b border-gray-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F97316] dark:border-neutral-800">
            Quick Create
          </p>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-[#F97316]/10 dark:text-white"
            onClick={() => {
              setOpen(false);
              onPostJob();
            }}
          >
            <BriefcaseBusiness size={16} className="text-[#F97316]" /> Post New Job (£ GBP)
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 border-t border-gray-200 px-3 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-[#F97316]/10 dark:border-neutral-800 dark:text-white"
            onClick={() => closeAndGo(setOpen, router, '/portal/leave')}
          >
            <CalendarDays size={16} className="text-[#F97316]" /> Log Employee Leave
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 border-t border-gray-200 px-3 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-[#F97316]/10 dark:border-neutral-800 dark:text-white"
            onClick={() => closeAndGo(setOpen, router, '/portal/expenses')}
          >
            <FileSpreadsheet size={16} className="text-[#F97316]" /> Add Expense Claim
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 border-t border-gray-200 px-3 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-[#F97316]/10 dark:border-neutral-800 dark:text-white"
            onClick={() => closeAndGo(setOpen, router, '/portal/employees/new')}
          >
            <Users size={16} className="text-[#F97316]" /> + Add Employee
          </button>
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Quick create"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          '-mt-5 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg shadow-orange-500/35 transition hover:scale-105',
          open ? 'bg-neutral-700' : 'bg-[#F97316] hover:bg-orange-600'
        )}
      >
        {open ? <X size={22} /> : <Plus size={24} strokeWidth={2.5} />}
      </button>
      <span className="mt-0.5 text-[9px] font-bold text-[#F97316]">Create</span>
    </div>
  );
}
