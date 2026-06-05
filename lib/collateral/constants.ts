export const COLLATERAL_TYPES = [
  'Real Estate / Property',
  'Vehicle',
  'Cryptocurrency',
  'Stocks / Bonds',
  'Precious Metals',
  'Other',
] as const;

export type CollateralType = (typeof COLLATERAL_TYPES)[number];
