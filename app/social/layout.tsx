import { redirect } from 'next/navigation';
import { Logo } from '@/components/logo';
import { SocialBottomNav } from '@/components/social/social-bottom-nav';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';

export default async function SocialLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin?redirect=/social');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();

  if (
    !isAdminEmail(user.email) &&
    profile?.role !== 'SOCIAL_MANAGER' &&
    profile?.role !== 'ADMIN'
  ) {
    redirect('/signin?redirect=/social');
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6">
        <header className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-2xl shadow-black/40 backdrop-blur-md">
          <Logo size="sm" />
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.28em] text-orange-500">
            Social Manager Portal
          </p>
          <h1 className="mt-2 text-2xl font-black text-white">Campaign Studio</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-400">
            Craft multi-channel campaigns, submit for Admin approval, and track Make.com syndication —
            navigation lives in the bottom bar.
          </p>
        </header>
        {children}
      </div>
      <SocialBottomNav />
    </div>
  );
}
