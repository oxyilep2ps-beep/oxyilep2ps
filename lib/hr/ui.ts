/** Shared HR / ATS form control styles — light + dark readable selects. */

export const HR_SELECT_CLASS =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#F97316] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-neutral-900 dark:[&>option]:text-neutral-100';

export const HR_INPUT_CLASS =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-neutral-500 focus:outline-none focus:border-[#F97316] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100';

export const HR_TEXTAREA_CLASS =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-neutral-500 focus:outline-none focus:border-[#F97316] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100';

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
