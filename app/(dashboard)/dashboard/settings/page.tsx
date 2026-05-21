'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  FileText,
  LifeBuoy,
  LogOut,
  ScrollText,
  Shield,
  User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SOCIAL_LINKS } from '@/lib/social-links';
import { cn } from '@/lib/utils';

type MenuItem = {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href?: string;
  external?: boolean;
  danger?: boolean;
  onClick?: () => void;
};

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/signin');
    router.refresh();
  };

  const items: MenuItem[] = [
    {
      label: 'Edit Profile',
      icon: User,
      href: '/dashboard/settings/edit-profile',
    },
    {
      label: 'Account Security',
      icon: Shield,
      href: '/dashboard/settings/account-security',
    },
    {
      label: 'Help & Support',
      icon: LifeBuoy,
      href: '/dashboard/settings/help-support',
    },
    {
      label: 'Privacy Policy',
      icon: FileText,
      href: '/privacy',
    },
    {
      label: 'Terms of Service',
      icon: ScrollText,
      href: '/terms',
    },
    {
      label: 'Log Out',
      icon: LogOut,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <section className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Manage your Oxyile account</p>
      </motion.div>

      <motion.nav
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="glass-card mt-6 overflow-hidden rounded-2xl border border-white/60 dark:border-white/10"
        aria-label="Settings menu"
      >
        <ul className="divide-y divide-white/50 dark:divide-white/10">
          {items.map((item, index) => {
            const Icon = item.icon;
            const rowClass = cn(
              'flex w-full items-center gap-4 px-5 py-4 text-left transition',
              item.danger
                ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
                : 'text-neutral-900 hover:bg-brand-500/5 dark:text-neutral-100 dark:hover:bg-white/5'
            );

            const inner = (
              <>
                <span
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                    item.danger ? 'bg-red-500/10' : 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
                  )}
                >
                  <Icon size={20} />
                </span>
                <span className="flex-1 text-sm font-semibold">{item.label}</span>
                {!item.danger && <ChevronRight size={18} className="text-neutral-400" />}
              </>
            );

            return (
              <motion.li
                key={item.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                {item.onClick ? (
                  <button type="button" onClick={item.onClick} className={rowClass}>
                    {inner}
                  </button>
                ) : item.external ? (
                  <a href={item.href} className={rowClass}>
                    {inner}
                  </a>
                ) : (
                  <Link href={item.href ?? '#'} className={rowClass}>
                    {inner}
                  </Link>
                )}
              </motion.li>
            );
          })}
        </ul>
      </motion.nav>

      <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
        Need help? {SOCIAL_LINKS.supportEmail}
      </p>
    </section>
  );
}
