'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download, ExternalLink, LogOut, X } from 'lucide-react';
import { Logo } from '@/components/logo';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { useAdminNotificationContext } from '@/components/admin/admin-notification-provider';
import {
  ADMIN_NAV_FOOTER,
  ADMIN_NAV_GROUPS,
  isAdminNavActive,
} from '@/lib/admin/nav-config';
import { cn } from '@/lib/utils';

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto rounded-md bg-[#F97316]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#F97316]">
      {count > 99 ? '99+' : count}
    </span>
  );
}

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
          'fixed inset-0 z-40 bg-black/60 lg:hidden',
          open ? 'block' : 'hidden'
        )}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-800 bg-[#0a0a0a] transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-800 px-5 py-4">
          <Link href="/admin-dashboard/command" className="flex min-w-0 items-center gap-3" onClick={onClose}>
            <Logo size="sm" href="" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">Oxyile</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F97316]">Admin</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.heading}>
              <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
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
                          active
                            ? 'bg-[#F97316]/10 text-[#F97316]'
                            : 'text-neutral-400 hover:bg-white/5 hover:text-white'
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
        </nav>

        <div className="space-y-3 border-t border-gray-800 p-3">
          <div className="rounded-2xl border border-gray-800 bg-[#111] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-white">
              <Download size={14} className="text-[#F97316]" />
              Download our Mobile App
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-neutral-500">
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
                      active ? 'bg-[#F97316]/10 text-[#F97316]' : 'text-neutral-400 hover:bg-white/5 hover:text-white'
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
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition hover:bg-white/5 hover:text-white"
              >
                <ExternalLink size={16} />
                View Public Site
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={onSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition hover:bg-white/5 hover:text-white"
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
