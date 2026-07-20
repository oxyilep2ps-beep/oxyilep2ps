export type UpdateWaitlistMemberInput = {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  role: 'investor' | 'borrower';
  status: 'pending' | 'approved' | 'rejected';
  target_amount: number;
  borrower_source_of_income: string | null;
  collateral_type: string | null;
  collateral_value: number;
  collateral_description: string | null;
  collateral_proof_url: string | null;
  open_banking_consent?: string | null;
  co_applicant_willingness?: string | null;
  blockchain_importance?: string | null;
  questionnaire_answers: Record<string, string>;
};
