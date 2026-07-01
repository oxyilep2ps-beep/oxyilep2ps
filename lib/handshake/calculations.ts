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

/** Flat-rate EMI: (Principal + fixed %) ÷ tenure — Phase 20 marketplace formula. */
export function calculateFlatEmi(
  loanAmount: number,
  tenureMonths: number,
  interestRatePercent = 10
): { emi_amount: number; total_repayment: number } {
  const principal = Number.isFinite(loanAmount) ? Math.max(0, loanAmount) : 0;
  const months = Number.isFinite(tenureMonths) ? Math.max(1, tenureMonths) : 1;
  const rate = Number.isFinite(interestRatePercent) ? Math.max(0, interestRatePercent) : 10;
  const totalRepayment = principal * (1 + rate / 100);
  const emi = totalRepayment / months;

  return {
    emi_amount: parseFloat(emi.toFixed(2)),
    total_repayment: parseFloat(totalRepayment.toFixed(2)),
  };
}

export function formatContractLabel(
  status: string,
  paymentStatus: string | null | undefined
): string {
  if (status === 'PENDING') return 'Awaiting investor escrow funding';
  if (status === 'FUNDED') return 'Escrow funded — awaiting borrower bank link';
  if (status === 'MATCHED') return 'Investor matched — activation pending';
  if (status === 'ACTIVE' && paymentStatus === 'PAID') return 'Paid — EMI schedule active';
  if (status === 'ACTIVE' && paymentStatus === 'ACTIVE') return 'Bank linked — EMI subscription active';
  if (status === 'ACTIVE') return 'Contract Approved — Money Pending';
  return status;
}
