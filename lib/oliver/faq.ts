export type OliverFaqEntry = {
  keywords: string[];
  answer: string;
};

export const OLIVER_GREETINGS: Record<string, string> = {
  hi: "Hello! I'm Oliver, your Oxyile guide. How can I help you today?",
  hello: "Hi there — Oliver here. Ask me anything about P2P lending on Oxyile.",
  hey: "Hey! Ready to help with investors, borrowers, or platform rules.",
  'good morning': 'Good morning! Hope your day is productive. What would you like to know?',
  'good afternoon': 'Good afternoon! How can I assist with your Oxyile account?',
  'good evening': "Good evening! I'm here if you have questions about loans or investing.",
  'how are you': "I'm running smoothly and ready to help. How was your day?",
  'how was your day': "Thanks for asking — I'm here to make your Oxyile experience easier. What do you need?",
  'how can you help': 'I can explain KYC, handshakes, investor rules, borrower repayments, fees, and platform safety.',
  thanks: "You're welcome! Anything else about Oxyile?",
  'thank you': 'Happy to help. Reach support@oxyilemoneyquest.support@gmail.com for account-specific issues.',
};

export const OLIVER_FAQ: OliverFaqEntry[] = [
  {
    keywords: ['what is oxyile', 'about oxyile', 'platform'],
    answer:
      'Oxyile is a UK peer-to-peer lending marketplace connecting verified investors with approved borrowers under FCA-minded compliance workflows.',
  },
  {
    keywords: ['kyc', 'verification', 'approve', 'pending'],
    answer:
      'KYC includes identity, address, and role-specific checks. Your profile stays PENDING until an admin approves — then chat and handshakes unlock.',
  },
  {
    keywords: ['investor', 'lend', 'lending'],
    answer:
      'Investors fund loans to approved borrowers. Returns depend on agreed rates and borrower performance — capital is at risk and not FSCS-protected.',
  },
  {
    keywords: ['borrower', 'loan', 'borrow'],
    answer:
      'Borrowers apply with affordability checks, may provide bank details after approval, and repay via agreed EMI schedules after handshake contracts.',
  },
  {
    keywords: ['handshake', 'contract', 'proposal'],
    answer:
      'A handshake is a dual-approved loan proposal in chat. Both parties approve, then the smart contract records the agreement and fiat settlement is tracked.',
  },
  {
    keywords: ['emi', 'repayment', 'monthly'],
    answer:
      'EMI is your estimated monthly repayment based on loan amount, annual interest, and duration shown on the handshake card.',
  },
  {
    keywords: ['interest rate', 'apr', 'rate'],
    answer:
      'Rates are negotiated between investor and borrower in each handshake. Review the card before approving.',
  },
  {
    keywords: ['fscs', 'protection', 'guarantee'],
    answer:
      'P2P loans on Oxyile are not covered by FSCS. Only lend or borrow what you can afford to lose or repay.',
  },
  {
    keywords: ['fee', 'charges', 'cost'],
    answer:
      'Platform fees may apply to loan servicing and payments. Final fee schedules are disclosed before contract activation.',
  },
  {
    keywords: ['default', 'missed payment'],
    answer:
      'Missed payments are handled per loan agreement and collections policy. Investors may experience partial or full loss.',
  },
  {
    keywords: ['withdraw', 'exit', 'liquidity'],
    answer:
      'P2P investments are typically illiquid until loans mature or secondary market features are available.',
  },
  {
    keywords: ['tax', 'hmrc', 'income tax'],
    answer:
      'Interest income may be taxable. Consult a qualified tax adviser for your personal situation.',
  },
  {
    keywords: ['aml', 'fraud', 'scam'],
    answer:
      'Report suspicious activity to support immediately. Never share passwords or send money outside official Oxyile flows.',
  },
  {
    keywords: ['password', 'reset', 'forgot'],
    answer:
      'Use Forgot Password on the sign-in page. Check spam for the reset email from Supabase auth.',
  },
  {
    keywords: ['email confirm', 'verify email'],
    answer:
      'After signup, confirm your email via the link sent to your inbox. Check spam if it does not arrive within a few minutes.',
  },
  {
    keywords: ['chat', 'message', 'realtime'],
    answer:
      'Approved investors and borrowers can chat in real time. Unread badges clear when you open a conversation.',
  },
  {
    keywords: ['polygon', 'blockchain', 'on-chain'],
    answer:
      'Approved handshakes can be recorded on Polygon Amoy testnet for auditability. Tx hashes appear in admin contracts view.',
  },
  {
    keywords: ['gocardless', 'direct debit', 'bank'],
    answer:
      'Borrowers may set up GoCardless Direct Debit after an active handshake for fiat collections in sandbox or live mode.',
  },
  {
    keywords: ['sort code', 'account number'],
    answer:
      'Borrowers can add UK bank details in Edit Profile after approval for payout and mandate setup.',
  },
  {
    keywords: ['postal code', 'address'],
    answer:
      'A valid UK postal code is required at signup for compliance and correspondence.',
  },
  {
    keywords: ['admin', 'support', 'contact'],
    answer:
      'Email oxyilemoneyquest.support@gmail.com for human support. Admins manage KYC, careers, and contracts separately.',
  },
  {
    keywords: ['careers', 'job', 'hiring'],
    answer:
      'Visit /careers to apply with your CV (PDF, max 5MB). Our team reviews applications in the admin portal.',
  },
  {
    keywords: ['blog', 'insights', 'article'],
    answer:
      'Read P2P guides and market updates at /blogs and individual articles under /blog/[slug].',
  },
  {
    keywords: ['minimum investment', 'how much invest'],
    answer:
      'Minimum amounts depend on live product rules and handshake terms — each proposal shows the exact principal.',
  },
  {
    keywords: ['credit check', 'credit score'],
    answer:
      'Borrowers consent to credit checks during onboarding. Results inform approval but are not shared in chat.',
  },
  {
    keywords: ['open banking'],
    answer:
      'Borrowers may consent to open banking for income verification as an alternative to document upload.',
  },
  {
    keywords: ['appropriateness', 'fca investor'],
    answer:
      'Investors complete appropriateness questions confirming they understand risk, illiquidity, and lack of FSCS cover.',
  },
  {
    keywords: ['diversify', 'portfolio'],
    answer:
      'Spreading capital across multiple borrowers reduces concentration risk but does not eliminate losses.',
  },
  {
    keywords: ['secondary market'],
    answer:
      'Secondary market access may be introduced in future phases — check announcements on your Main Hub.',
  },
  {
    keywords: ['privacy', 'data'],
    answer:
      'See /privacy for how we process personal data under UK GDPR expectations.',
  },
  {
    keywords: ['terms', 'legal'],
    answer:
      'Platform terms are at /terms. Handshake contracts supplement terms for each loan.',
  },
  {
    keywords: ['two factor', '2fa', 'security'],
    answer:
      'Enhanced account security features are rolling out — use a strong unique password today.',
  },
  {
    keywords: ['pending verification', 'stuck'],
    answer:
      "If you remain on pending verification, an admin is still reviewing KYC. You'll receive access when status becomes APPROVED.",
  },
  {
    keywords: ['reject', 'declined kyc'],
    answer:
      'If KYC is rejected, you may need to re-register with corrected documents. Contact support for specifics.',
  },
  {
    keywords: ['role', 'investor borrower switch'],
    answer:
      'Roles are fixed at signup — investors and borrowers see opposite counterparties in discovery and chat.',
  },
  {
    keywords: ['announcement', 'main hub'],
    answer:
      'Platform updates appear on your Main Hub dashboard after admins publish announcements.',
  },
  {
    keywords: ['money pending', 'payment status'],
    answer:
      'After both parties approve a handshake, status shows Contract Approved — Money Pending until fiat settlement is confirmed.',
  },
  {
    keywords: ['paid', 'emi schedule'],
    answer:
      'When admin marks fiat as PAID, your handshake reflects an active EMI schedule based on the agreed terms.',
  },
  {
    keywords: ['risk warning'],
    answer:
      'Do not invest unless prepared to lose all money invested. This is a high-risk investment.',
  },
  {
    keywords: ['complaint', 'ombudsman'],
    answer:
      'Submit complaints via support email. We follow internal dispute resolution before external escalation where applicable.',
  },
  {
    keywords: ['cookie', 'tracking'],
    answer:
      'We use essential cookies for authentication and session security. Marketing cookies are minimised.',
  },
  {
    keywords: ['mobile', 'phone app'],
    answer:
      'Oxyile is mobile-responsive in the browser. Native apps may follow in later releases.',
  },
  {
    keywords: ['handshake approve', 'both approve'],
    answer:
      'Each party taps Approve on the in-chat handshake card. When both approve, the contract executes on-chain and enters money-pending state.',
  },
  {
    keywords: ['oliver', 'bot', 'who are you'],
    answer:
      "I'm Oliver — Oxyile's assistant for FAQs and navigation. For account actions, use Settings or email support.",
  },
];

/** Extend this array with your remaining ~70 FAQs — structure supports easy push(). */
export const OLIVER_FAQ_EXTENSION_HINT =
  'Add more entries to OLIVER_FAQ in lib/oliver/faq.ts using the same { keywords, answer } shape.';

export function matchOliverReply(input: string): string {
  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return 'Type a question about Oxyile — lending, borrowing, KYC, or handshakes.';
  }

  for (const [key, reply] of Object.entries(OLIVER_GREETINGS)) {
    if (normalized === key || normalized.startsWith(`${key} `)) {
      return reply;
    }
  }

  let best: OliverFaqEntry | null = null;
  let bestScore = 0;

  for (const entry of OLIVER_FAQ) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (normalized.includes(kw)) score += kw.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore > 0) {
    return best.answer;
  }

  return "I don't have a specific answer for that yet. Try asking about KYC, handshakes, EMI, or investor risk — or email support for account help.";
}
