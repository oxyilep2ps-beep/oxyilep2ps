'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { getHrPortalSettings, updateHrPortalSettings, type HrPortalSettings } from '@/app/actions/hr-suite';
import { HR_SELECT_CLASS } from '@/lib/hr/ui';
import { HrSkeletonCards } from '@/components/hr/hr-skeleton';
import { cn } from '@/lib/utils';

export function HrSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<HrPortalSettings | null>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSettings(await getHrPortalSettings());
    } catch {
      setSettings({
        company_legal_entity: 'Oxyile Ltd (UK FinTech Lender)',
        default_currency: 'GBP',
        public_careers_sync: true,
        ats_email_notifications: true,
        default_dbs_level: 'standard',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (partial: Partial<HrPortalSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...partial };
    setSettings(next);
    setSaved(false);
    startTransition(() => {
      void updateHrPortalSettings(partial)
        .then(() => setSaved(true))
        .catch((e) => setError(e instanceof Error ? e.message : 'Save failed'));
    });
  };

  if (loading) return <HrSkeletonCards count={3} />;

  return (
    <div className="cms-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">HRMS Configuration</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Corporate people-ops defaults for Oxyile. Changes apply across ATS, payroll, and public careers.
        </p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-600">Settings saved.</p> : null}

      <section className="glass-card space-y-4 rounded-2xl p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-orange-500">Company legal entity</p>
          <p className="mt-2 text-lg font-bold text-neutral-950 dark:text-white">
            {settings?.company_legal_entity ?? 'Oxyile Ltd (UK FinTech Lender)'}
          </p>
          <p className="mt-1 text-sm text-neutral-500">Registered UK FinTech lender — offer letters & audits use this name.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/60">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100">Default currency lock</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">British Pound (£ GBP) for salary, expenses, bonuses, and offers.</p>
          </div>
          <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-orange-400">
            £ GBP · Locked
          </span>
        </div>

        <ToggleRow
          title="Public careers sync"
          description="When enabled, open ATS jobs with publish enabled appear automatically on /careers."
          checked={settings?.public_careers_sync ?? true}
          disabled={pending}
          onChange={(v) => patch({ public_careers_sync: v })}
        />

        <ToggleRow
          title="ATS email notifications"
          description="Alert HR when new resumes are submitted from the public careers page."
          checked={settings?.ats_email_notifications ?? true}
          disabled={pending}
          onChange={(v) => patch({ ats_email_notifications: v })}
        />

        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100">UK compliance & DBS tracking</p>
          <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Default verification level for new applicants in the ATS.</p>
          <select
            className={HR_SELECT_CLASS}
            value={settings?.default_dbs_level ?? 'standard'}
            onChange={(e) => patch({ default_dbs_level: e.target.value })}
            disabled={pending}
          >
            <option value="basic">Basic check</option>
            <option value="standard">Standard DBS</option>
            <option value="enhanced">Enhanced DBS</option>
          </select>
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="max-w-md">
        <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100">{title}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-8 w-14 rounded-full transition',
          checked ? 'bg-orange-500' : 'bg-gray-300 dark:bg-neutral-700'
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-6 w-6 rounded-full bg-white transition',
            checked ? 'left-7' : 'left-1'
          )}
        />
      </button>
    </div>
  );
}
