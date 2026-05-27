/** Monthly EMI and total repayment for P2P handshakes using simple annual interest. */
export function calculateHandshakeFigures(amount: number, annualRatePercent: number, durationMonths: number) {
  const principal = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const rate = Number.isFinite(annualRatePercent) ? Math.max(0, annualRatePercent) : 0;
  const months = Number.isFinite(durationMonths) ? Math.max(1, durationMonths) : 1;
  const totalReturn = principal + principal * (rate / 100) * (months / 12);
  const emi = totalReturn / months;

  return {
    emi_amount: parseFloat(emi.toFixed(2)),
    total_return: parseFloat(totalReturn.toFixed(2)),
  };
}

export function formatContractLabel(
  status: string,
  paymentStatus: string | null | undefined
): string {
  if (status === 'PENDING') return 'Awaiting dual approval';
  if (status === 'ACTIVE' && paymentStatus === 'PAID') return 'Paid — EMI schedule active';
  if (status === 'ACTIVE' && paymentStatus === 'ACTIVE') return 'Bank linked — EMI subscription active';
  if (status === 'ACTIVE') return 'Contract Approved — Money Pending';
  return status;
}
