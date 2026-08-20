'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircle, Search, Settings, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUnreadMessageCount } from '@/app/actions/chat';
import { isApprovedStatus } from '@/lib/auth/profile-status';
import { cn } from '@/lib/utils';

const ALL_ITEMS = [
  { href: '/chat', label: 'Chat', icon: MessageCircle, match: 'chat' as const, badge: true, approvedOnly: true },
  { href: '/search', label: 'Search', icon: Search, match: 'search' as const },
  { href: '/profile', label: 'Profile', icon: User, match: 'profile' as const },
  { href: '/settings', label: 'Settings', icon: Settings, match: 'settings' as const },
] as const;

function isNavActive(pathname: string, match: (typeof ALL_ITEMS)[number]['match']): boolean {
  switch (match) {
    case 'chat':
      return pathname === '/chat' || pathname.startsWith('/chat/') || pathname === '/chats' || pathname.startsWith('/chats/');
    case 'search':
      return pathname === '/search' || pathname.startsWith('/search/');
    case 'profile':
      return pathname === '/profile' || pathname.startsWith('/profile/') || pathname.startsWith('/settings/profile');
    case 'settings':
      return pathname === '/settings' || pathname.startsWith('/dashboard/settings');
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

  const isChatRoom = (pathname.startsWith('/chats/') && pathname !== '/chats') || pathname.startsWith('/chat/');
  const colCount = items.length;

  return (
    <nav
      aria-label="Dashboard navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/30 bg-white/70 px-1 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-black/80"
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
                    ? 'bg-[#F97316] text-white shadow-glow'
                    : 'text-neutral-600 hover:bg-[#F97316]/10 hover:text-[#F97316] dark:text-neutral-400 dark:hover:text-[#F97316]'
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
