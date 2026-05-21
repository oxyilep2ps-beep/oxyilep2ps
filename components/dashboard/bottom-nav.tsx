'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, MessageCircle, PieChart, Settings, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUnreadMessageCount } from '@/app/actions/chat';
import { isApprovedStatus } from '@/lib/auth/profile-status';
import { cn } from '@/lib/utils';

const ALL_ITEMS = [
  { href: '/dashboard', label: 'Main Hub', icon: LayoutGrid, match: 'hub' as const },
  { href: '/dashboard/profile', label: 'Profile', icon: User, match: 'profile' as const },
  { href: '/dashboard/portfolio', label: 'Graph', icon: PieChart, match: 'portfolio' as const },
  { href: '/chats', label: 'Chats', icon: MessageCircle, match: 'chats' as const, badge: true, approvedOnly: true },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, match: 'settings' as const },
] as const;

function isNavActive(pathname: string, match: (typeof ALL_ITEMS)[number]['match']): boolean {
  switch (match) {
    case 'hub':
      return pathname === '/dashboard' || pathname === '/dashboard/';
    case 'profile':
      return pathname.startsWith('/dashboard/profile');
    case 'portfolio':
      return pathname.startsWith('/dashboard/portfolio');
    case 'chats':
      return pathname === '/chats' || pathname.startsWith('/chats/');
    case 'settings':
      return pathname.startsWith('/dashboard/settings');
    default:
      return false;
  }
}

export function BottomNav() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [approved, setApproved] = useState(false);
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!approved) {
      setUnread(0);
      return;
    }
    const count = await getUnreadMessageCount();
    setUnread(count);
  }, [approved]);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAuthenticated(Boolean(user));
      if (!user) {
        setApproved(false);
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('status').eq('id', user.id).maybeSingle();
      setApproved(isApprovedStatus(profile?.status as string | undefined));
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void init();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authenticated || !approved) return;

    void refreshUnread();

    const supabase = createClient();
    const channel = supabase
      .channel('nav-unread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        void refreshUnread();
      })
      .subscribe();

    const onRead = () => void refreshUnread();
    window.addEventListener('oxyile:chat-read', onRead);
    const interval = window.setInterval(() => void refreshUnread(), 30000);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener('oxyile:chat-read', onRead);
      window.clearInterval(interval);
    };
  }, [approved, authenticated, refreshUnread]);

  const items = useMemo(
    () => ALL_ITEMS.filter((item) => !('approvedOnly' in item && item.approvedOnly) || approved),
    [approved]
  );

  if (!authenticated) return null;

  const isChatRoom = pathname.startsWith('/chats/') && pathname !== '/chats';
  const colCount = items.length;

  return (
    <nav
      aria-label="Dashboard navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/30 bg-white/90 px-1 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-black/90"
    >
      <ul
        className="mx-auto grid max-w-lg gap-0.5"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = isNavActive(pathname, item.match);
          const Icon = item.icon;
          const showBadge = 'badge' in item && item.badge && unread > 0 && !isChatRoom;

          return (
            <li key={item.href} className="relative">
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center rounded-2xl px-1 py-2 text-[9px] font-semibold transition sm:text-[10px]',
                  active
                    ? 'bg-brand-500 text-white shadow-glow'
                    : 'text-neutral-600 hover:bg-brand-500/10 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-300'
                )}
              >
                <span className="relative">
                  <Icon size={18} strokeWidth={active ? 2.25 : 2} />
                  {showBadge && (
                    <span className="absolute -right-2 -top-1 grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
