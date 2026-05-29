import Link from 'next/link';
import { Briefcase } from 'lucide-react';

export default function HrHomePage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href="/hr/careers" className="glass-card rounded-2xl p-6 transition hover:border-brand-300">
        <Briefcase className="text-brand-500" size={28} />
        <h2 className="mt-3 text-lg font-bold text-neutral-950 dark:text-white">Careers</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Review job applications, download resumes, and manage the hiring pipeline.
        </p>
      </Link>
    </div>
  );
}
