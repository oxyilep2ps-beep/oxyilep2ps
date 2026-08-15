import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BriefcaseBusiness, MapPin, Wallet } from 'lucide-react';
import { getPublicJob } from '@/app/actions/public-careers';
import { CareersApplyForm } from '@/components/careers/careers-apply-form';
import { Footer } from '@/components/footer';
import { formatJobCompensation } from '@/lib/hr/types';
import { employmentTypeLabel } from '@/lib/hr/ui';

export default async function PublicJobApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getPublicJob(id);
  if (!job) notFound();

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Link href="/careers" className="inline-flex items-center gap-2 text-sm font-semibold text-[#F97316] hover:text-orange-400">
          <ArrowLeft size={16} /> All roles
        </Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#F97316]">Open role</p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">{job.title}</h1>
        <p className="mt-2 text-sm text-neutral-400">
          {job.department} · {employmentTypeLabel(job.employment_type)} · {job.location || 'UK'}
        </p>

        <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F97316]/15 px-2.5 py-1 text-[#F97316]">
            <BriefcaseBusiness size={12} />
            {employmentTypeLabel(job.employment_type)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-800 px-2.5 py-1 text-neutral-300">
            <MapPin size={12} />
            {job.location || 'UK'}
          </span>
          <span className="inline-flex max-w-full items-center gap-1 whitespace-normal rounded-full bg-emerald-500/15 px-2.5 py-1 text-left text-emerald-400">
            <Wallet size={12} />
            {formatJobCompensation(job)}
          </span>
        </div>

        <div className="mt-8 space-y-5 text-sm leading-7 text-neutral-300">
          <div className="rounded-2xl border border-[#F97316]/20 bg-[#F97316]/10 px-4 py-3 font-semibold text-orange-300">
            Compensation: {formatJobCompensation(job)}
          </div>
          <Block title="Description">
            {job.description || 'Join Oxyile to ship compliant, customer-obsessed FinTech.'}
          </Block>
          <Block title="Key responsibilities & UK / FCA compliance">
            {job.compliance_responsibilities ||
              job.responsibilities ||
              'Uphold FCA-aligned conduct, data protection, and customer safeguarding standards.'}
          </Block>
          <Block title="Requirements">{job.requirements}</Block>
        </div>

        <div className="mt-8">
          <CareersApplyForm jobId={job.id} roleTitle={job.title} />
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-[#F97316]">{title}</p>
      <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-white/5 bg-neutral-950 px-4 py-3">{children}</div>
    </div>
  );
}
