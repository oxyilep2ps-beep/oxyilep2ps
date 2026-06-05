'use client';

import { Shield } from 'lucide-react';
import { COLLATERAL_TYPES } from '@/lib/collateral/constants';
import { cn } from '@/lib/utils';

export type CollateralFormValues = {
  collateralType: string;
  collateralValue: string;
  collateralDescription: string;
  collateralProof: File | null;
};

type CollateralFormSectionProps = {
  values: CollateralFormValues;
  onChange: (patch: Partial<CollateralFormValues>) => void;
  className?: string;
  inputClassName?: string;
};

export function CollateralFormSection({
  values,
  onChange,
  className,
  inputClassName,
}: CollateralFormSectionProps) {
  const fieldClass = cn(
    'w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40',
    inputClassName
  );

  return (
    <div className={cn('space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20', className)}>
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-amber-600 dark:text-amber-400" />
        <p className="text-sm font-bold text-neutral-950 dark:text-white">
          Asset / Collateral Backup <span className="text-brand-500">(Mandatory)</span>
        </p>
      </div>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        Provide security details for your loan request. All fields are required for borrowers.
      </p>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Collateral Type
        </span>
        <select
          required
          value={values.collateralType}
          onChange={(e) => onChange({ collateralType: e.target.value })}
          className={fieldClass}
        >
          <option value="">Select collateral type</option>
          {COLLATERAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Estimated Collateral Value (£)
        </span>
        <input
          required
          type="number"
          min="1"
          step="1"
          value={values.collateralValue}
          onChange={(e) => onChange({ collateralValue: e.target.value })}
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Asset Description
        </span>
        <textarea
          required
          rows={3}
          value={values.collateralDescription}
          onChange={(e) => onChange({ collateralDescription: e.target.value })}
          placeholder="e.g., Address of property, Make/Model of vehicle"
          className={fieldClass}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Proof of Ownership (Deed, Logbook, Wallet Screenshot)
        </span>
        <input
          required
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => onChange({ collateralProof: e.target.files?.[0] ?? null })}
          className={cn(fieldClass, 'cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white')}
        />
        {values.collateralProof ? (
          <p className="mt-1 text-xs text-brand-600 dark:text-brand-300">{values.collateralProof.name}</p>
        ) : null}
      </label>
    </div>
  );
}
