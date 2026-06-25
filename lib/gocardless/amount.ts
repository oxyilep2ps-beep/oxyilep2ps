/**
 * Convert a major-unit GBP amount (e.g. 10.50) to GoCardless minor units (pence).
 * Conversion happens only at API submission — never in UI or Supabase.
 */
export function toGoCardlessAmountPence(amountGbp: number): number {
  const major = Number(amountGbp);
  if (!Number.isFinite(major) || major <= 0) return 0;
  return Math.round(major * 100);
}
