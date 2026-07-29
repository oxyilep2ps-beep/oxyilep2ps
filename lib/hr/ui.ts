/** Shared HR / ATS form control styles — dark-theme readable selects. */

export const HR_SELECT_CLASS =
  'w-full bg-neutral-900 text-neutral-100 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 [&>option]:bg-neutral-900 [&>option]:text-neutral-100';

export const HR_INPUT_CLASS =
  'w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-orange-500';

export const HR_TEXTAREA_CLASS =
  'w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-orange-500';

export function employmentTypeLabel(type: string): string {
  switch (type) {
    case 'full_time':
      return 'Full-time FTE';
    case 'contractor':
      return 'Contractor';
    case 'fixed_term':
      return 'Fixed-Term';
    case 'part_time':
      return 'Part-time';
    case 'intern':
      return 'Intern';
    default:
      return type.replace(/_/g, ' ');
  }
}
