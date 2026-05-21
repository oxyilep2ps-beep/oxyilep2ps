/** Monthly EMI and total repayment for P2P handshake display (UK, monthly compounding). */
export function calculateHandshakeFigures(amount: number, annualRatePercent: number, durationMonths: number) {
  const principal = Math.max(0, amount);
  const months = Math.max(1, Math.round(durationMonths));
  const monthlyRate = annualRatePercent / 100 / 12;

  let emi: number;
  if (monthlyRate === 0) {
    emi = principal / months;
  } else {
    const factor = Math.pow(1 + monthlyRate, months);
    emi = (principal * monthlyRate * factor) / (factor - 1);
  }

  const totalReturn = emi * months;
  return {
    emi_amount: Math.round(emi * 100) / 100,
    total_return: Math.round(totalReturn * 100) / 100,
  };
}

export function formatContractLabel(
  status: string,
  paymentStatus: string | null | undefined
): string {
  if (status === 'PENDING') return 'Awaiting dual approval';
  if (status === 'ACTIVE' && paymentStatus === 'PAID') return 'Paid — EMI schedule active';
  if (status === 'ACTIVE') return 'Contract Approved — Money Pending';
  return status;
}
