import type { AdminHandshakeRow } from '@/app/actions/admin-handshakes';

export type LoanHealthStatus = 'good' | 'missed' | 'defaulted' | 'pending';

export function getLoanHealthStatus(row: AdminHandshakeRow): LoanHealthStatus {
  if (row.status !== 'ACTIVE') return 'pending';

  if (row.payment_status === 'PAID') return 'good';

  const daysSince = (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (row.payment_status === 'PENDING' && daysSince > 35) return 'defaulted';
  if (row.payment_status === 'PENDING') return 'missed';

  return 'good';
}

export const LOAN_HEALTH_LABELS: Record<LoanHealthStatus, string> = {
  good: 'Active / Good',
  missed: '1 Missed EMI',
  defaulted: 'Defaulted',
  pending: 'Pending',
};

export const LOAN_HEALTH_COLORS: Record<LoanHealthStatus, string> = {
  good: 'bg-emerald-500',
  missed: 'bg-orange-500',
  defaulted: 'bg-red-600',
  pending: 'bg-neutral-400',
};
