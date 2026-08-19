'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

function getPortalDashboardHref(role?: string | null): string {
  if (role === 'ADMIN') return '/admin-dashboard/command';
  if (role === 'HR') return '/hr';
  if (role === 'BLOGGER') return '/blogger';
  if (role === 'SOCIAL_MANAGER') return '/social';
  if (role === 'EMPLOYEE') return '/employee/dashboard';
  return '/feed';
}

export function useNavbarAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dashboardHref, setDashboardHref] = useState('/dashboard');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    setUser(currentUser);

    if (!currentUser) {
      setDashboardHref('/dashboard');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', currentUser.id)
      .maybeSingle();

    setDashboardHref(getPortalDashboardHref(profile?.role as string | null));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    router.refresh();
  }, [router]);

  return { user, dashboardHref, loading, signOut };
}
