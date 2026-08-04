import { BloggerBottomNav } from '@/components/blogger/blogger-bottom-nav';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';
import { isBloggerStaffEmail } from '@/lib/auth/role-emails';
import { redirect } from 'next/navigation';

export default async function BloggerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin?redirect=/blogger');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();

  if (
    !isAdminEmail(user.email) &&
    !isBloggerStaffEmail(user.email) &&
    profile?.role !== 'BLOGGER' &&
    profile?.role !== 'ADMIN'
  ) {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 pb-28 pt-6 sm:px-6">
      <header className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5 backdrop-blur">
        <Logo size="sm" />
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.28em] text-[#F97316]">Blogger Portal</p>
        <h1 className="mt-2 text-2xl font-black text-white">Editorial Studio</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-400">
          Create, optimise, backdate and publish on one scrollable page — no tab hopping mid-draft.
        </p>
      </header>
      {children}
      <BloggerBottomNav />
    </div>
  );
}
