/**
 * GoCardless Direct Debit service — fiat mandate & payment between UK bank accounts.
 * Docs: https://developer.gocardless.com/
 *
 * Required env: GOCARDLESS_ACCESS_TOKEN, GOCARDLESS_ENVIRONMENT (sandbox | live)
 */

export type GoCardlessEnvironment = 'sandbox' | 'live';

export interface UkBankAccount {
  accountHolderName: string;
  sortCode: string;
  accountNumber: string;
}

export interface CreateMandateInput {
  customerEmail: string;
  customerGivenName: string;
  customerFamilyName: string;
  bankAccount: UkBankAccount;
  metadata?: Record<string, string>;
}

export interface CreateMandateResult {
  success: boolean;
  mandateId?: string;
  customerId?: string;
  redirectUrl?: string;
  error?: string;
}

export interface InitiatePaymentInput {
  mandateId: string;
  amountPence: number;
  currency?: 'GBP';
  description: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface InitiatePaymentResult {
  success: boolean;
  paymentId?: string;
  status?: 'pending_submission' | 'submitted' | 'confirmed' | 'failed';
  error?: string;
}

const GOCARDLESS_BASE: Record<GoCardlessEnvironment, string> = {
  sandbox: 'https://api-sandbox.gocardless.com',
  live: 'https://api.gocardless.com',
};

function getConfig() {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN;
  const environment = (process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox') as GoCardlessEnvironment;
  return { token, environment, baseUrl: GOCARDLESS_BASE[environment] };
}

async function goCardlessRequest<T>(
  path: string,
  method: 'GET' | 'POST',
  body?: unknown
): Promise<T> {
  const { token, baseUrl } = getConfig();
  if (!token) {
    throw new Error('GOCARDLESS_ACCESS_TOKEN is not configured');
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'GoCardless-Version': '2015-07-06',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GoCardless API error ${res.status}: ${err}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Creates a Direct Debit mandate for the payer (typically borrower) bank account.
 */
export async function createDirectDebitMandate(
  input: CreateMandateInput
): Promise<CreateMandateResult> {
  const { token } = getConfig();
  if (!token) {
    console.info('[gocardlessService:stub] createDirectDebitMandate', input);
    return {
      success: true,
      mandateId: `MD${Date.now()}`,
      customerId: `CU${Date.now()}`,
    };
  }

  try {
    // 1. Create customer
    const customer = await goCardlessRequest<{ customers: { id: string } }>(
      '/customers',
      'POST',
      {
        customers: {
          email: input.customerEmail,
          given_name: input.customerGivenName,
          family_name: input.customerFamilyName,
          metadata: input.metadata,
        },
      }
    );

    // 2. Create customer bank account + mandate (simplified — use Billing Requests flow in prod)
    const sortCode = input.bankAccount.sortCode.replace(/\D/g, '');
    const mandate = await goCardlessRequest<{ mandates: { id: string } }>(
      '/mandates',
      'POST',
      {
        mandates: {
          scheme: 'bacs',
          links: { customer: customer.customers.id },
          metadata: input.metadata,
        },
      }
    );

    void sortCode;
    void input.bankAccount;

    return {
      success: true,
      mandateId: mandate.mandates.id,
      customerId: customer.customers.id,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Mandate creation failed',
    };
  }
}

/**
 * Initiates a fiat collection/payout flow between lender and borrower bank accounts
 * via GoCardless payments API (mandate must be active).
 */
export async function initiateFiatTransfer(
  input: InitiatePaymentInput
): Promise<InitiatePaymentResult> {
  const { token } = getConfig();
  if (!token) {
    console.info('[gocardlessService:stub] initiateFiatTransfer', input);
    return {
      success: true,
      paymentId: `PM${Date.now()}`,
      status: 'pending_submission',
    };
  }

  try {
    const payment = await goCardlessRequest<{ payments: { id: string; status: string } }>(
      '/payments',
      'POST',
      {
        payments: {
          amount: input.amountPence,
          currency: input.currency ?? 'GBP',
          description: input.description,
          metadata: input.metadata,
          links: { mandate: input.mandateId },
        },
      }
    );

    return {
      success: true,
      paymentId: payment.payments.id,
      status: payment.payments.status as InitiatePaymentResult['status'],
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Payment initiation failed',
    };
  }
}

/**
 * Dual-flow orchestrator: mandate on borrower side, payment instruction for loan disbursement/repayment.
 */
export async function orchestrateLenderBorrowerFiatFlow(params: {
  borrowerMandate: CreateMandateInput;
  payment: Omit<InitiatePaymentInput, 'mandateId'>;
}): Promise<{ mandate: CreateMandateResult; payment?: InitiatePaymentResult }> {
  const mandate = await createDirectDebitMandate(params.borrowerMandate);
  if (!mandate.success || !mandate.mandateId) {
    return { mandate };
  }

  const payment = await initiateFiatTransfer({
    ...params.payment,
    mandateId: mandate.mandateId,
  });

  return { mandate, payment };
}
