/** Profile Live Financial Portfolio — all money in £ GBP. */

export type ProfileFinancialRole = 'borrower' | 'investor' | 'guarantor';

export type ProfileGuarantorSecurity = {
  name: string | null;
  email: string | null;
  status: 'none' | 'pending' | 'invited' | 'accepted' | 'rejected';
  mandateActive: boolean;
  label: string;
};

export type ProfileFinancialRelationship = {
  id: string;
  status: string;
  loanAmountGbp: number;
  interestRatePct: number;
  tenureMonths: number;
  emiAmountGbp: number;
  totalReturnGbp: number;
  interestEarnedGbp: number;
  borrower: { id: string; name: string };
  investor: { id: string | null; name: string | null };
  guarantor: ProfileGuarantorSecurity;
  mandateActive: boolean;
};

export type ProfileFinancialPortfolio = {
  primaryRole: 'BORROWER' | 'INVESTOR' | 'ADMIN' | 'HR' | 'BLOGGER' | string;
  viewerRoles: ProfileFinancialRole[];
  relationships: ProfileFinancialRelationship[];
  borrowerRelationships: ProfileFinancialRelationship[];
  investorRelationships: ProfileFinancialRelationship[];
  guarantorRelationships: ProfileFinancialRelationship[];
  investorMetrics: {
    totalDeployedGbp: number;
    expectedReturnsGbp: number;
    averageYieldPct: number;
  };
};

export function formatGbp(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPct(rate: number): string {
  const value = Number.isFinite(rate) ? rate : 0;
  return `${value.toLocaleString('en-GB', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}%`;
}
