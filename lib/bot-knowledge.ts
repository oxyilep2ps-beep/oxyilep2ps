export type BotKnowledgeEntry = {
  id: string;
  keywords: string[];
  answer: string;
};

export const BOT_KNOWLEDGE: BotKnowledgeEntry[] = [
  { id: 'k01', keywords: ['what is oxyile', 'about oxyile', 'platform'], answer: 'Oxyile is a UK peer-to-peer lending platform connecting verified investors with approved borrowers, with in-chat handshakes, GoCardless EMIs, and Polygon contract records.' },
  { id: 'k02', keywords: ['handshake', 'proposal', 'deal'], answer: 'A handshake is a loan proposal sent inside chat. Both parties must approve before the smart contract mints and GoCardless auto-EMI can activate.' },
  { id: 'k03', keywords: ['approve handshake', 'dual approval'], answer: 'Each party taps Approve on the handshake card. When both approve, the borrower links their bank via GoCardless; then Polygon mint and monthly EMI collection run.' },
  { id: 'k04', keywords: ['emi', 'monthly payment', 'installment'], answer: 'EMI is your estimated monthly repayment based on loan amount, annual rate, and duration. It is shown on the handshake card before you approve.' },
  { id: 'k05', keywords: ['total return', 'total repayment'], answer: 'Total return is the sum of all scheduled EMIs over the loan term — principal plus interest, displayed on the handshake card.' },
  { id: 'k06', keywords: ['interest rate', 'apr', 'rate'], answer: 'The interest rate on a handshake is agreed between lender and borrower and shown as an annual percentage on the proposal card.' },
  { id: 'k07', keywords: ['gocardless', 'direct debit', 'bank link'], answer: 'Borrowers authorise a UK Direct Debit mandate through GoCardless after both parties approve a handshake. This enables automated monthly EMI collection.' },
  { id: 'k08', keywords: ['mandate', 'authorisation'], answer: 'A GoCardless mandate is your permission for Oxyile to collect EMIs from your linked UK bank account on the agreed schedule.' },
  { id: 'k09', keywords: ['polygon', 'smart contract', 'on-chain', 'web3'], answer: 'After bank linking, Oxyile mints a handshake record on Polygon Amoy (sandbox or live) for auditability. You can view the tx on Polygonscan when available.' },
  { id: 'k10', keywords: ['auto-emi', 'subscription', 'recurring'], answer: 'Once the mandate is active, Oxyile creates a GoCardless subscription to auto-deduct the EMI amount each month for the loan duration.' },
  { id: 'k11', keywords: ['kyc', 'verification', 'identity'], answer: 'All users complete KYC during signup: identity, address, and role-specific checks. Admins manually review before your account is approved.' },
  { id: 'k12', keywords: ['pending verification', 'waiting approval'], answer: 'If your status is pending, our compliance team is reviewing your submission. You will get access to dashboard and chat once approved.' },
  { id: 'k13', keywords: ['investor', 'lend', 'lender'], answer: 'Investors fund handshakes with borrowers they discover via recommendations and chat. You propose or accept terms, then approve the handshake card.' },
  { id: 'k14', keywords: ['borrower', 'loan', 'borrow'], answer: 'Borrowers receive loan proposals in chat, review EMI and total return, approve, then link a bank account for automated repayments.' },
  { id: 'k15', keywords: ['chat', 'message', 'inbox'], answer: 'Use Chats in the bottom nav to message matched investors or borrowers. Handshake proposals appear as cards inside the conversation.' },
  { id: 'k16', keywords: ['unread', 'badge'], answer: 'The Chats tab shows an unread count when you have new messages. Opening a thread marks messages as read.' },
  { id: 'k17', keywords: ['online', 'presence', 'typing'], answer: 'Chat shows online status and typing indicators when the other party is active in the same room.' },
  { id: 'k18', keywords: ['password', 'reset', 'forgot'], answer: 'Use Forgot password on the sign-in page. We email a secure link to set a new password.' },
  { id: 'k19', keywords: ['email verify', 'confirm email'], answer: 'After signup, confirm your email via the link we send. Check spam if you do not see it within a few minutes.' },
  { id: 'k20', keywords: ['sign up', 'register', 'create account'], answer: 'Sign up as Investor or Borrower, complete KYC fields including UK postal code, and wait for admin approval before full access.' },
  { id: 'k21', keywords: ['sign in', 'login'], answer: 'Sign in with the email and password you registered. Approved users land on the dashboard; admins on the admin portal.' },
  { id: 'k22', keywords: ['profile', 'avatar', 'bio'], answer: 'Edit Profile under Settings lets you set username, bio, avatar, and cover photo with our image cropper.' },
  { id: 'k23', keywords: ['postal code', 'postcode'], answer: 'UK postal code is required at signup and stored on your profile for compliance and address verification.' },
  { id: 'k24', keywords: ['bank details', 'sort code', 'account number'], answer: 'Borrowers can add UK sort code and account number in Edit Profile for payout and mandate alignment.' },
  { id: 'k25', keywords: ['security', 'safe', 'protect'], answer: 'Oxyile uses Supabase auth, row-level security, encrypted transport, admin-only tools, and segregated admin social data.' },
  { id: 'k26', keywords: ['data', 'privacy', 'gdpr'], answer: 'We process data for KYC, contracts, and payments per our Privacy Policy. You can request support via Help in Settings.' },
  { id: 'k27', keywords: ['fees', 'charges', 'cost'], answer: 'Platform fees depend on your product tier and payment rails. Handshake cards show full repayment totals before you commit.' },
  { id: 'k28', keywords: ['default', 'missed payment'], answer: 'Missed GoCardless collections are retried per scheme rules. Contact support if you expect payment difficulties.' },
  { id: 'k29', keywords: ['cancel handshake', 'withdraw'], answer: 'While status is PENDING, parties can decline by not approving. Active handshakes follow contract and mandate terms.' },
  { id: 'k30', keywords: ['contract approved', 'money pending'], answer: 'This status means both approved and the smart contract minted; fiat settlement or admin PAID marking may still be in progress.' },
  { id: 'k31', keywords: ['paid', 'fiat cleared'], answer: 'Admins mark fiat PAID after GoCardless or treasury confirms funds movement. EMI schedule then reflects live collections.' },
  { id: 'k32', keywords: ['sandbox', 'test', 'amoy'], answer: 'Sandbox mode uses GoCardless test environment and Polygon Amoy with placeholder contract addresses for safe demos.' },
  { id: 'k33', keywords: ['portfolio', 'investments'], answer: 'Portfolio summarizes your active handshakes and agreement status as an investor or borrower.' },
  { id: 'k34', keywords: ['announcement', 'hub', 'news'], answer: 'The Main Hub shows admin announcements about platform updates, rates, and feature releases.' },
  { id: 'k35', keywords: ['recommendation', 'discover'], answer: 'Approved investors see recommended borrowers and vice versa, excluding admin profiles from discovery.' },
  { id: 'k36', keywords: ['admin', 'compliance'], answer: 'Oxyile admins review KYC, manage careers applications, monitor contracts, and use a private admin comms center.' },
  { id: 'k37', keywords: ['careers', 'jobs', 'apply'], answer: 'Visit /careers to apply with a PDF resume (max 5MB). Applications are reviewed by the admin team.' },
  { id: 'k38', keywords: ['blog', 'insights', 'articles'], answer: 'Read fintech and P2P articles on /blogs — guides on lending, Web3, and portfolio strategy.' },
  { id: 'k39', keywords: ['oliver', 'bot', 'support'], answer: 'I am Oliver, the in-dashboard assistant. Ask about handshakes, EMIs, GoCardless, Polygon, KYC, or account settings.' },
  { id: 'k40', keywords: ['help', 'support', 'contact'], answer: 'Open Settings → Help & Support for FAQs and contact options, or keep chatting with me here.' },
  { id: 'k41', keywords: ['terms', 'legal'], answer: 'Terms of Service and Privacy Policy are linked from Settings and the website footer.' },
  { id: 'k42', keywords: ['fc', 'fca', 'regulation'], answer: 'Oxyile is built with compliance-first workflows. Specific regulatory permissions depend on your jurisdiction and product launch status.' },
  { id: 'k43', keywords: ['aml', 'fraud'], answer: 'We perform identity verification and monitor unusual activity. Report concerns via support channels.' },
  { id: 'k44', keywords: ['document', 'upload', 'pdf'], answer: 'KYC uploads accept images and PDFs during signup. Careers applications require PDF resumes only.' },
  { id: 'k45', keywords: ['reject', 'kyc rejected'], answer: 'If KYC is rejected, you will receive a reason from admins. You may need to resubmit corrected documents.' },
  { id: 'k46', keywords: ['username', 'handle'], answer: 'Usernames are 3–30 characters: lowercase letters, numbers, and underscores. They must be unique across the platform.' },
  { id: 'k47', keywords: ['dark mode', 'theme'], answer: 'Toggle light/dark theme from the navbar to match your preference across dashboard and public pages.' },
  { id: 'k48', keywords: ['mobile', 'phone', 'responsive'], answer: 'Oxyile is mobile-first: bottom navigation, glass cards, and scrollable tables work on small screens.' },
  { id: 'k49', keywords: ['duration', 'months', 'term'], answer: 'Loan duration is set in months on the handshake proposal and drives EMI and total return calculations.' },
  { id: 'k50', keywords: ['loan amount', 'principal'], answer: 'The loan amount is the principal borrowed, shown in GBP on the handshake card.' },
  { id: 'k51', keywords: ['early repayment', 'pay off early'], answer: 'Early settlement terms depend on your handshake agreement. Contact the counterparty or support for a payoff quote.' },
  { id: 'k52', keywords: ['secondary market'], answer: 'Secondary trading of loan positions is on our roadmap; today focus is primary handshakes in chat.' },
  { id: 'k53', keywords: ['tax', 'income tax'], answer: 'Investors may owe tax on interest received. Consult a UK tax adviser; Oxyile does not provide tax advice.' },
  { id: 'k54', keywords: ['statement', 'history'], answer: 'Payment history will appear in Portfolio and via GoCardless notifications once mandates are active.' },
  { id: 'k55', keywords: ['notification', 'alert'], answer: 'Email is used for auth, password reset, and key status changes. In-app announcements appear on the Main Hub.' },
  { id: 'k56', keywords: ['two factor', '2fa', 'mfa'], answer: 'Account Security in Settings will host MFA options as we roll out enhanced protection.' },
  { id: 'k57', keywords: ['delete account', 'close account'], answer: 'To close your account, contact support with your registered email. Active handshakes must be settled first.' },
  { id: 'k58', keywords: ['change email', 'email address'], answer: 'Email changes require support verification for security. Use Help & Support to request an update.' },
  { id: 'k59', keywords: ['change role', 'investor to borrower'], answer: 'Roles are fixed at signup for compliance. Contact support if you need a formal role change review.' },
  { id: 'k60', keywords: ['open banking'], answer: 'Borrower KYC may include open banking consent for income verification during onboarding.' },
  { id: 'k61', keywords: ['credit check'], answer: 'Borrowers consent to proportionate credit checks as part of responsible lending onboarding.' },
  { id: 'k62', keywords: ['income', 'affordability'], answer: 'Borrowers declare income and expenses so investors and compliance can assess affordability.' },
  { id: 'k63', keywords: ['source of funds', 'investor funds'], answer: 'Investors declare source of funds during KYC to meet AML requirements.' },
  { id: 'k64', keywords: ['appropriateness', 'suitability'], answer: 'Investor appropriateness questions confirm you understand P2P risks before approval.' },
  { id: 'k65', keywords: ['wallet', 'crypto'], answer: 'You do not need a personal crypto wallet; Polygon minting is handled by platform infrastructure.' },
  { id: 'k66', keywords: ['tx hash', 'transaction', 'polygonscan'], answer: 'After minting, a transaction hash may appear on the handshake card linking to Polygon Amoy on Polygonscan.' },
  { id: 'k67', keywords: ['bank linked', 'checkmark'], answer: 'Bank Linked means your GoCardless mandate is active. Smart Contract Minted confirms on-chain record. Auto-EMI Active means subscriptions are scheduled.' },
  { id: 'k68', keywords: ['authorisation url', 'redirect'], answer: 'When approving as borrower with both signatures, you are redirected to GoCardless to authorise Direct Debit, then returned to complete mint and EMI setup.' },
  { id: 'k69', keywords: ['webhook', 'payment status'], answer: 'GoCardless webhooks update mandate and payment status securely on our servers.' },
  { id: 'k70', keywords: ['failed payment', 'payment failed'], answer: 'Failed debits trigger GoCardless retry logic. Update bank details or contact support if failures persist.' },
  { id: 'k71', keywords: ['cancel mandate', 'stop direct debit'], answer: 'You can cancel a mandate through your bank or GoCardless according to scheme rules; active loans may need settlement first.' },
  { id: 'k72', keywords: ['lender protection'], answer: 'Risk is borne by lenders per handshake terms. Diversify across multiple borrowers and durations.' },
  { id: 'k73', keywords: ['borrower protection'], answer: 'Terms are transparent before approval. You see EMI and total return with no hidden fields on the card.' },
  { id: 'k74', keywords: ['dispute', 'complaint'], answer: 'Raise disputes via Help & Support with handshake ID and chat context for faster resolution.' },
  { id: 'k75', keywords: ['api', 'developer'], answer: 'Public API access is not available to retail users. Enterprise integrations are contact-only.' },
  { id: 'k76', keywords: ['status pending', 'handshake pending'], answer: 'PENDING handshakes await one or both approvals. No chain mint or EMI until complete.' },
  { id: 'k77', keywords: ['status active', 'handshake active'], answer: 'ACTIVE handshakes have both approvals and typically completed bank link and contract mint steps.' },
  { id: 'k78', keywords: ['propose', 'send proposal'], answer: 'In chat, use the handshake icon in the message bar to enter amount, rate, and months, then send the proposal card.' },
  { id: 'k79', keywords: ['who can chat'], answer: 'Approved investors and borrowers chat with each other. Admin profiles are hidden from retail chat lists.' },
  { id: 'k80', keywords: ['session', 'logout'], answer: 'Log out from Settings. Admins have a red Sign Out button in Admin Settings.' },
  { id: 'k81', keywords: ['cookies', 'tracking'], answer: 'We use essential cookies for auth and session. See Privacy Policy for analytics details.' },
  { id: 'k82', keywords: ['uk', 'united kingdom', 'gbp'], answer: 'Oxyile targets UK users with GBP loans and UK bank rails via GoCardless BACS.' },
  { id: 'k83', keywords: ['minimum loan', 'maximum loan'], answer: 'Loan size limits depend on risk policy and counterparty appetite; propose any amount within chat and agree mutually.' },
  { id: 'k84', keywords: ['compound', 'compounding'], answer: 'EMI estimates use standard monthly amortization on the agreed annual rate for display on the card.' },
  { id: 'k85', keywords: ['holiday', 'payment pause'], answer: 'Payment holidays are not automatic; discuss with your lender and contact support for documented arrangements.' },
  { id: 'k86', keywords: ['insurance'], answer: 'Oxyile does not sell payment protection insurance. Evaluate your own risk cover needs.' },
  { id: 'k87', keywords: ['institutional'], answer: 'Institutional onboarding is separate from retail signup. Contact the team via the website.' },
  { id: 'k88', keywords: ['roadmap', 'future features'], answer: 'Upcoming improvements include richer portfolio analytics, enhanced MFA, and expanded secondary market research.' },
];

export function searchBotKnowledge(query: string): string | null {
  const q = query.toLowerCase().replace(/[^\w\s]/g, ' ');
  const tokens = q.split(/\s+/).filter((t) => t.length > 2);

  let best: { score: number; answer: string } | null = null;

  for (const entry of BOT_KNOWLEDGE) {
    let score = 0;
    for (const kw of entry.keywords) {
      const kwLower = kw.toLowerCase();
      if (q.includes(kwLower)) score += 4;
      for (const token of tokens) {
        if (kwLower.includes(token) || token.includes(kwLower.split(' ')[0] ?? '')) score += 1;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { score, answer: entry.answer };
    }
  }

  return best && best.score >= 2 ? best.answer : null;
}
