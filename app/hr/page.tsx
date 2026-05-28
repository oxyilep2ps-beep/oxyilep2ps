import Link from 'next/link';

export default function HrHomePage() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[
        { href: '/hr/careers', title: 'Careers', desc: 'Review job applications and resumes.' },
        { href: '/hr/learning', title: 'Learning Hub', desc: '40+ L&D resources for the HR team.' },
        { href: '/hr/blogs', title: 'Blog Editor', desc: 'Draft articles for admin approval.' },
      ].map((card) => (
        <Link key={card.href} href={card.href} className="glass-card rounded-2xl p-6 transition hover:border-brand-300">
          <h2 className="text-lg font-bold text-neutral-950 dark:text-white">{card.title}</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{card.desc}</p>
        </Link>
      ))}
    </div>
  );
}
