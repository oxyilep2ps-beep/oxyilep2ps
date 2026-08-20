'use client';

import { FormEvent, useState, useTransition } from 'react';
import Link from 'next/link';
import { Camera, CheckCircle2, FileText, Loader2, ShieldCheck, Upload, Video } from 'lucide-react';
import { submitInvestorUpgradeRequest } from '@/app/actions/role-upgrades';
import { cn } from '@/lib/utils';

const MAX_BYTES = 10 * 1024 * 1024;

function FileDrop({
  label,
  hint,
  accept,
  file,
  onFile,
  onReject,
  icon,
}: {
  label: string;
  hint: string;
  accept?: string;
  file: File | null;
  onFile: (f: File | null) => void;
  onReject?: (message: string) => void;
  icon: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-[#F97316]/35 bg-[#F97316]/5 p-5 text-center transition hover:border-[#F97316]/60 dark:bg-[#F97316]/10">
      {icon}
      <span className="text-sm font-semibold text-neutral-950 dark:text-white">{label}</span>
      <span className="text-xs text-neutral-600 dark:text-neutral-400">{hint}</span>
      {file ? <span className="text-xs text-[#F97316]">{file.name}</span> : null}
      <input
        type="file"
        className="sr-only"
        accept={accept}
        onChange={(e) => {
          const selected = e.target.files?.[0] ?? null;
          if (selected && selected.size > MAX_BYTES) {
            e.target.value = '';
            onFile(null);
            onReject?.('File is too large. Please upload a document under 10MB.');
            return;
          }
          onFile(selected);
        }}
      />
    </label>
  );
}

export function InvestorUpgradeForm() {
  const [idType, setIdType] = useState('');
  const [proofOfIdentity, setProofOfIdentity] = useState<File | null>(null);
  const [proofOfAddress, setProofOfAddress] = useState<File | null>(null);
  const [livenessVideo, setLivenessVideo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('proofOfIdentityType', idType);
      if (proofOfIdentity) formData.append('proofOfIdentity', proofOfIdentity);
      if (proofOfAddress) formData.append('proofOfAddress', proofOfAddress);
      if (livenessVideo) formData.append('livenessVideo', livenessVideo);

      const result = await submitInvestorUpgradeRequest(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-[#F97316]/35 bg-[#0a0a0a] p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#F97316]/15 text-[#F97316]">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-xl font-black text-white">Request submitted</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-300">
          Your request is under review by the Admin team. You&apos;ll receive an in-app notification once a decision
          is made.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/dashboard/borrower"
            className="rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#ea580c]"
          >
            Back to Borrower Portal
          </Link>
          <Link
            href="/feed"
            className="rounded-full border border-neutral-700 px-5 py-2.5 text-sm font-semibold text-neutral-300 hover:border-[#F97316]/40 hover:text-[#F97316]"
          >
            Global Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#F97316]/15 text-[#F97316]">
          <ShieldCheck size={20} />
        </span>
        <div>
          <h1 className="text-lg font-black text-white">Become an Investor</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Upload investor KYC documents on this same account. An admin must approve before investor capabilities are
            enabled.
          </p>
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">
          Proof of identity type
        </span>
        <select
          required
          value={idType}
          onChange={(e) => setIdType(e.target.value)}
          className="w-full rounded-xl border border-neutral-700 bg-black px-4 py-3 text-sm text-white outline-none focus:border-[#F97316]/60"
        >
          <option value="">Select document</option>
          <option value="passport">Passport</option>
          <option value="driving_licence">Driving Licence</option>
          <option value="brp">Biometric Residence Permit (BRP)</option>
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <FileDrop
          label="Proof of Identity"
          hint="JPG, PNG, or PDF — max 10MB"
          accept=".jpg,.jpeg,.png,.pdf"
          file={proofOfIdentity}
          onFile={setProofOfIdentity}
          onReject={setError}
          icon={<FileText className="text-[#F97316]" size={24} />}
        />
        <FileDrop
          label="Proof of Address"
          hint="JPG, PNG, or PDF — max 10MB"
          accept=".jpg,.jpeg,.png,.pdf"
          file={proofOfAddress}
          onFile={setProofOfAddress}
          onReject={setError}
          icon={<Upload className="text-[#F97316]" size={24} />}
        />
      </div>

      <FileDrop
        label="Liveness Video / Selfie Check"
        hint="Image or MP4 video — max 10MB"
        accept="image/*,video/mp4"
        file={livenessVideo}
        onFile={setLivenessVideo}
        onReject={setError}
        icon={<Video className="text-[#F97316]" size={24} />}
      />

      <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-black/50 p-3 text-xs text-neutral-400">
        <Camera size={16} className="shrink-0 text-[#F97316]" />
        Documents are stored securely and reviewed by Oxyile admins before your investor flag is enabled.
      </div>

      {error ? (
        <p className="rounded-xl border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm font-semibold text-[#F97316]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-full bg-[#F97316] py-3 text-sm font-bold text-white transition hover:bg-[#ea580c] disabled:opacity-60'
        )}
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {pending ? 'Submitting…' : 'Submit for admin review'}
      </button>
    </form>
  );
}
