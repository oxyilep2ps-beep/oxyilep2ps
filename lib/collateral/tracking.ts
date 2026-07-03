export const COLLATERAL_STATUSES = ['pending', 'verified', 'rejected'] as const;

export type CollateralStatus = (typeof COLLATERAL_STATUSES)[number];

export const LTV_APPROVED_RATIO = 0.7;

export function calculateMaxLtvAmount(assetApprovedValue: number): number {
  const approved = Number(assetApprovedValue);
  if (!Number.isFinite(approved) || approved <= 0) return 0;
  return Math.round(approved * LTV_APPROVED_RATIO * 100) / 100;
}

export type PendingCollateralVerification = {
  id: string;
  borrower_id: string;
  borrower_email: string;
  loan_amount: number;
  asset_declared_value: number;
  collateral_docs_url: string | null;
  collateral_type: string | null;
  collateral_status: CollateralStatus;
  created_at: string;
};
