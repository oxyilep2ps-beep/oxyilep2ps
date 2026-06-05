/** Loan-to-Value ratio as a percentage (loan amount ÷ collateral value × 100). */
export function calculateLtvRatio(loanAmount: number, collateralValue: number): number | null {
  if (loanAmount <= 0 || collateralValue <= 0) return null;
  return (loanAmount / collateralValue) * 100;
}

export function formatLtvRatio(loanAmount: number, collateralValue: number): string {
  const ratio = calculateLtvRatio(loanAmount, collateralValue);
  if (ratio === null) return '—';
  return `${ratio.toLocaleString('en-GB', { maximumFractionDigits: 1 })}%`;
}

export function ltvRiskLevel(ratio: number | null): 'safe' | 'warning' | 'unknown' {
  if (ratio === null) return 'unknown';
  return ratio > 80 ? 'warning' : 'safe';
}
