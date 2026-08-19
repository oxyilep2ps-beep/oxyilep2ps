'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeftRight, Download, ExternalLink, LogOut, X } from 'lucide-react';
import { Logo } from '@/components/logo';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { useAdminNotificationContext } from '@/components/admin/admin-notification-provider';
import {
  ADMIN_NAV_FOOTER,
  ADMIN_NAV_GROUPS,
  isAdminNavActive,
} from '@/lib/admin/nav-config';
import { ADMIN_VIEW_AS_PORTALS, resolveViewAsPortal } from '@/lib/admin/view-as-portals';
import { cn } from '@/lib/utils';

function ViewAsMenu({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = resolveViewAsPortal(pathname);

  return (
    <div className="overflow-hidden rounded-xl border border-[#F97316]/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-[#F97316]/5"
      >
        <ArrowLeftRight size={13} className="shrink-0 text-[#F97316]" />
        <span className="flex-1 text-xs font-bold text-[#F97316]">View As</span>
        <svg
          className={cn('h-3.5 w-3.5 shrink-0 text-[#F97316] transition-transform', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul className="border-t border-[#F97316]/10 px-1 py-1">
          {ADMIN_VIEW_AS_PORTALS.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                  item.id === current
                    ? 'bg-[#F97316]/15 text-[#F97316]'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'
                )}
              >
                <item.icon size={13} />
                {item.label}
                {item.id === current && (
                  <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-[#F97316]/60">
                    Active
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto rounded-md bg-[#F97316]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#F97316]">
      {count > 99 ? '99+' : count}
    </span>
  );
}

const NAV_IDLE =
  'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white';

export function AdminSidebarV2({
  open,
  onClose,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const { counts } = useAdminNotificationContext();

  return (
    <>
      <button
        type="button"
        aria-label="Close sidebar"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 dark:bg-black/60 lg:hidden',
          open ? 'block' : 'hidden'
        )}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white/90 backdrop-blur-xl transition-transform duration-300 dark:border-gray-800 dark:bg-[#0a0a0a]/90 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <Link href="/admin-dashboard/command" className="flex min-w-0 items-center gap-3" onClick={onClose}>
            <Logo size="sm" href="" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-gray-900 dark:text-white">Oxyile</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F97316]">Admin</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.heading}>
              <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                {group.heading}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isAdminNavActive(pathname, item.href, item.exact);
                  const Icon = item.icon;
                  const badge = item.badgeKey ? counts[item.badgeKey] : 0;
                  return (
                    <li key={`${item.href}-${item.label}`}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                          active ? 'bg-[#F97316]/10 text-[#F97316]' : NAV_IDLE
                        )}
                      >
                        {active ? (
                          <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[#F97316]" />
                        ) : null}
                        <Icon size={16} strokeWidth={active ? 2.4 : 2} />
                        <span className="truncate">{item.label}</span>
                        <NavBadge count={badge} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* View As — inside scrollable area so it never clips the footer */}
          <ViewAsMenu onClose={onClose} />
        </nav>

        <div className="space-y-3 border-t border-gray-200 p-3 dark:border-gray-800">
          {/* ViewAsMenu moved into scrollable nav above */}
          <span />

          <div className="rounded-2xl border border-gray-200 bg-gray-50/90 p-3 dark:border-gray-800 dark:bg-[#111]/90">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white">
              <Download size={14} className="text-[#F97316]" />
              Download our Mobile App
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
              Install Oxyile for faster admin alerts on the go.
            </p>
            <InstallAppButton layout="menu" className="h-9 text-[11px]" />
          </div>

          <ul className="space-y-0.5">
            {ADMIN_NAV_FOOTER.map((item) => {
              const active = isAdminNavActive(pathname, item.href, item.exact);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                      active ? 'bg-[#F97316]/10 text-[#F97316]' : NAV_IDLE
                    )}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/"
                onClick={onClose}
                className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition', NAV_IDLE)}
              >
                <ExternalLink size={16} />
                View Public Site
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={onSignOut}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  NAV_IDLE
                )}
              >
                <LogOut size={16} />
                Logout
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}
