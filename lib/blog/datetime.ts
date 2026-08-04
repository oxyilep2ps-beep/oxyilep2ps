/** Blog Studio datetime helpers — historical backdating allowed. */

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Convert datetime-local string to ISO. Returns null when empty/invalid. Past dates are allowed. */
export function fromDatetimeLocalValue(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export const BLOG_CATEGORIES = [
  'FinTech',
  'Lending',
  'Investing',
  'Compliance',
  'Product',
  'Culture',
  'News',
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];
