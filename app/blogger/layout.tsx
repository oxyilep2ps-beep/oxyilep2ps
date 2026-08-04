import { BloggerBottomNav } from '@/components/blogger/blogger-bottom-nav';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/auth/routing';
import { isBloggerStaffEmail } from '@/lib/auth/role-emails';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const links = [
  { href: '/blogger', label: 'Overview' },
  { href: '/blogger/blogs', label: 'Blog Editor' },
  { href: '/blogger/seo', label: 'SEO Studio' },
  { href: '/blogger/seo-guide', label: 'SEO Guide' },
  { href: '/blogger/settings', label: 'Settings' },
];

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
        <p className="mt-1 text-sm text-neutral-400">
          Create, optimise, backdate and publish on one scrollable page — no tab hopping mid-draft.
        </p>
        <nav className="mt-5 flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-neutral-800 bg-neutral-900/70 px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:border-[#F97316]/40 hover:text-[#F97316]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
      <BloggerBottomNav />
    </div>
  );
}
