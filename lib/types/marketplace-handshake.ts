/** Marketplace handshake lifecycle (Phase 20). DB stores uppercase enum values. */
export type MarketplaceHandshakeStatus = 'PENDING' | 'MATCHED' | 'ACTIVE' | 'CLOSED' | 'DEFAULTED';

export type MarketplaceHandshakeRow = {
  id: string;
  borrower_id: string;
  /** Maps to `lender_id` in the database. */
  investor_id: string | null;
  loan_amount: number;
  tenure_months: number;
  interest_rate: number;
  emi_amount: number;
  collateral_type: string;
  collateral_value: number;
  collateral_description: string;
  collateral_proof_url: string;
  status: MarketplaceHandshakeStatus;
  gocardless_mandate_id: string | null;
  smart_contract_address: string | null;
  next_emi_date: string | null;
  created_at: string;
};

export type AdminLiveHandshakeRow = MarketplaceHandshakeRow & {
  borrower_email: string;
  investor_email: string | null;
};

export function displayHandshakeStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function handshakeStatusTone(
  status: string
): 'gray' | 'blue' | 'green' | 'amber' | 'red' {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'gray';
    case 'MATCHED':
      return 'blue';
    case 'ACTIVE':
      return 'green';
    case 'CLOSED':
      return 'amber';
    case 'DEFAULTED':
      return 'red';
    default:
      return 'gray';
  }
}
