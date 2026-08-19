'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  ArrowLeftRight,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  ClipboardList,
  Download,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  Newspaper,
  PenSquare,
  Search,
  Rss,
  Settings,
  Share2,
  SquareArrowOutUpRight,
  Star,
  User,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { cn } from '@/lib/utils';
import type { PortalId } from '@/components/shared/universal-dashboard-layout';

// ─── Nav config per portal ─────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

const HR_NAV: NavGroup[] = [
  {
    heading: 'Social Layer',
    items: [
      { href: '/feed', label: 'Global Feed', icon: Rss },
      { href: '/chat', label: 'Chat Inbox', icon: MessageCircle },
    ],
  },
  {
    heading: 'HR Suite',
    items: [
      { href: '/hr', label: 'Overview', icon: LayoutDashboard, exact: true },
      { href: '/hr/recruitment', label: 'Recruitment', icon: ClipboardList },
      { href: '/hr/careers', label: 'Job Postings', icon: Briefcase },
      { href: '/hr/employees', label: 'Employees', icon: Users },
      { href: '/hr/payroll', label: 'Payroll', icon: Building2 },
      { href: '/hr/performance', label: 'Performance', icon: Star },
      { href: '/hr/attendance', label: 'Attendance', icon: Calendar },
      { href: '/hr/learning', label: 'Learning', icon: BookOpen },
      { href: '/hr/blogs', label: 'Blogs', icon: Newspaper },
    ],
  },
  {
    heading: 'Admin',
    items: [
      { href: '/hr/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const BLOGGER_NAV: NavGroup[] = [
  {
    heading: 'Editorial',
    items: [
      { href: '/blogger', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/blogger/blogs', label: 'My Posts', icon: Newspaper },
      { href: '/blogger/seo', label: 'SEO', icon: Search },
      { href: '/blogger/seo-guide', label: 'SEO Guide', icon: BookOpen },
      { href: '/blogger/social-studio', label: 'Social Studio', icon: Share2 },
    ],
  },
  {
    heading: 'Account',
    items: [
      { href: '/blogger/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const SOCIAL_NAV: NavGroup[] = [
  {
    heading: 'Campaign Studio',
    items: [
      { href: '/social', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/social/studio', label: 'Create Post', icon: PenSquare },
      { href: '/social/calendar', label: 'Calendar', icon: Calendar },
      { href: '/social/analytics', label: 'Analytics', icon: Star },
      { href: '/social/guide', label: 'Guide', icon: BookOpen },
    ],
  },
  {
    heading: 'Account',
    items: [
      { href: '/social/settings', label: 'Settings', icon: Settings },
    ],
  },
];

// Admin portal nav re-exported from nav-config as inline to keep this file self-contained
const ADMIN_NAV: NavGroup[] = [
  {
    heading: 'Menu',
    items: [
      { href: '/admin-dashboard/command', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/admin-dashboard/applications', label: 'Applications', icon: ClipboardList },
      { href: '/admin-dashboard/waitlist', label: 'Waitlist', icon: Users },
      { href: '/admin-dashboard/support', label: 'Support', icon: Megaphone },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { href: '/admin-dashboard/blogs', label: 'Blogs', icon: Newspaper },
      { href: '/admin-dashboard/social-reviews', label: 'Social', icon: Share2 },
      { href: '/admin-dashboard/careers', label: 'Careers', icon: Briefcase },
      { href: '/admin-dashboard/employees', label: 'Employees', icon: UserCog },
    ],
  },
];

const PORTAL_NAV: Record<PortalId, NavGroup[]> = {
  admin: ADMIN_NAV,
  hr: HR_NAV,
  blogger: BLOGGER_NAV,
  social: SOCIAL_NAV,
};

const PORTAL_FOOTER_LINKS: Record<PortalId, { href: string; label: string }> = {
  admin: { href: '/admin-dashboard/profile', label: 'Profile' },
  hr: { href: '/hr/guide', label: 'HR Guide' },
  blogger: { href: '/blogger/settings', label: 'Blogger Settings' },
  social: { href: '/social/settings', label: 'Social Settings' },
};

const PORTAL_TITLES: Record<PortalId, { title: string; tag: string }> = {
  admin: { title: 'Oxyile', tag: 'Admin' },
  hr: { title: 'Oxyile', tag: 'HR Portal' },
  blogger: { title: 'Oxyile', tag: 'Editorial' },
  social: { title: 'Oxyile', tag: 'Social' },
};

// ─── Portal Switcher (collapsible accordion — lives inside scrollable nav) ───

const SWITCHER_ITEMS: { id: PortalId; label: string; href: string; icon: React.ElementType }[] = [
  { id: 'admin', label: 'Admin Portal', href: '/admin-dashboard', icon: SquareArrowOutUpRight },
  { id: 'hr', label: 'HR Portal', href: '/hr', icon: Building2 },
  { id: 'blogger', label: 'Blogger Portal', href: '/blogger', icon: Newspaper },
  { id: 'social', label: 'Social Manager', href: '/social', icon: Share2 },
];

function PortalSwitcher({ current, onClose }: { current: PortalId; onClose: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-[#F97316]/20">
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-[#F97316]/5"
      >
        <ArrowLeftRight size={13} className="shrink-0 text-[#F97316]" />
        <span className="flex-1 text-xs font-bold text-[#F97316]">Switch Portal</span>
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

      {/* Accordion body — animates open/close */}
      {open && (
        <ul className="border-t border-[#F97316]/10 px-1 py-1">
          {SWITCHER_ITEMS.map((item) => (
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

// ─── Sidebar ────────────────────────────────────────────────────────────────

const NAV_IDLE =
  'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white';

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function UniversalSidebar({
  open,
  onClose,
  onSignOut,
  portal,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  portal: PortalId;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const groups = PORTAL_NAV[portal];
  const { title, tag } = PORTAL_TITLES[portal];
  const footerLink = PORTAL_FOOTER_LINKS[portal];
  const dashboardHref = portal === 'admin' ? '/admin-dashboard' : `/${portal}`;

  return (
    <>
      {/* Backdrop */}
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
        {/* Brand */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <Link href={dashboardHref} className="flex min-w-0 items-center gap-3" onClick={onClose}>
            <Logo size="sm" href="" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-gray-900 dark:text-white">{title}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F97316]">{tag}</p>
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

        {/* Nav — scrollable */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.heading}>
              <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                {group.heading}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href, item.exact);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                          active ? 'bg-[#F97316]/10 text-[#F97316]' : NAV_IDLE
                        )}
                      >
                        {active && (
                          <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[#F97316]" />
                        )}
                        <Icon size={16} strokeWidth={active ? 2.4 : 2} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Admin-only portal switcher — inside scrollable area so it never overflows the footer */}
          {isAdmin && (
            <div>
              <PortalSwitcher current={portal} onClose={onClose} />
            </div>
          )}
        </nav>

        {/* Footer — compact, fixed height */}
        <div className="space-y-2 border-t border-gray-200 p-3 dark:border-gray-800">
          {/* PortalSwitcher moved into scrollable nav above */}

          {/* Install app card */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/90 p-3 dark:border-gray-800 dark:bg-[#111]/90">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white">
              <Download size={14} className="text-[#F97316]" />
              Download our App
            </div>
            <InstallAppButton layout="menu" className="h-9 text-[11px]" />
          </div>

          <ul className="space-y-0.5">
            <li>
              <Link
                href={footerLink.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive(pathname, footerLink.href) ? 'bg-[#F97316]/10 text-[#F97316]' : NAV_IDLE
                )}
              >
                <User size={16} />
                {footerLink.label}
              </Link>
            </li>
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
                className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition', NAV_IDLE)}
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
