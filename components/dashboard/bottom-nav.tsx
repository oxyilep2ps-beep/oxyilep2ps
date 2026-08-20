'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Home, MessageCircle, Search, Settings, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUnreadMessageCount } from '@/app/actions/chat';
import { isApprovedStatus } from '@/lib/auth/profile-status';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/feed', label: 'Home', icon: Home, match: 'feed' as const },
  { href: '/search', label: 'Search', icon: Search, match: 'search' as const },
  { href: '/chat', label: 'Chat', icon: MessageCircle, match: 'chat' as const, badge: true },
  { href: '/profile', label: 'Profile', icon: User, match: 'profile' as const },
  { href: '/settings', label: 'Settings', icon: Settings, match: 'settings' as const },
] as const;

function isNavActive(pathname: string, match: (typeof NAV_ITEMS)[number]['match']): boolean {
  switch (match) {
    case 'feed':
      return pathname === '/feed' || pathname.startsWith('/feed/') || pathname === '/';
    case 'search':
      return pathname === '/search' || pathname.startsWith('/search/');
    case 'chat':
      return (
        pathname === '/chat' ||
        pathname.startsWith('/chat/') ||
        pathname === '/chats' ||
        pathname.startsWith('/chats/')
      );
    case 'profile':
      return pathname === '/profile' || pathname.startsWith('/profile/') || pathname.startsWith('/settings/profile');
    case 'settings':
      return (
        pathname === '/settings' ||
        (pathname.startsWith('/settings/') && !pathname.startsWith('/settings/profile')) ||
        pathname.startsWith('/dashboard/settings')
      );
    default:
      return false;
  }
}

/** Instagram-style mobile bottom nav — visible only below `md`. */
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
    setUnread(await getUnreadMessageCount());
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
      .channel('social-bottom-nav-unread')
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

  if (!authenticated) return null;

  const isChatRoom =
    (pathname.startsWith('/chats/') && pathname !== '/chats') ||
    (pathname.startsWith('/chat/') && pathname !== '/chat');

  return (
    <nav
      aria-label="Social navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-black/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.match);
          const Icon = item.icon;
          const showBadge = 'badge' in item && item.badge && unread > 0 && !isChatRoom;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold transition active:scale-95',
                  active ? 'text-[#F97316]' : 'text-gray-400 hover:text-gray-200'
                )}
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} className={cn(active && 'fill-[#F97316]/15')} />
                  {showBadge ? (
                    <span className="absolute -right-2.5 -top-1 grid min-h-[15px] min-w-[15px] place-items-center rounded-full bg-[#F97316] px-1 text-[9px] font-bold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  ) : null}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
