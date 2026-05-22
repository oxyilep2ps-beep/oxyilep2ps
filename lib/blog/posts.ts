export type BlogPost = {
  slug: string;
  title: string;
  tag: string;
  readTime: string;
  publishedAt: string;
  excerpt: string;
  body: string[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'p2p-lending-uk-borrowing',
    title: 'How P2P lending is reshaping UK borrowing',
    tag: 'Guide',
    readTime: '6 min read',
    publishedAt: '11 May 2026',
    excerpt:
      'Peer-to-peer lending connects verified investors with creditworthy borrowers — often with clearer terms than legacy channels.',
    body: [
      'The UK P2P market has matured into a regulated alternative to traditional bank loans for many households and small businesses. Platforms like Oxyile focus on transparency: every handshake shows loan amount, rate, duration, EMI, and total return before either party approves.',
      'Borrowers benefit from competitive pricing when their profile demonstrates stable income and responsible credit behaviour. Investors gain access to diversified exposure with contract records anchored on-chain for auditability.',
      'Before you apply, gather proof of identity, address history, and (for borrowers) income verification. Our compliance team reviews each profile manually — quality over speed.',
      'When both parties approve a handshake in chat, the contract moves to “Contract Approved — Money Pending” until fiat settlement clears. EMI schedules then follow the agreed monthly figure.',
    ],
  },
  {
    slug: 'market-update-rates-2026',
    title: 'Market update: inflation, rates, and investor demand',
    tag: 'Market',
    readTime: '4 min read',
    publishedAt: '8 May 2026',
    excerpt: 'A snapshot of how macro conditions influence P2P yields and borrower affordability in 2026.',
    body: [
      'Base rates and inflation expectations continue to shape investor appetite for fixed-income style returns. P2P platforms price risk at the individual handshake level rather than a single pooled product rate.',
      'Investors should stress-test portfolios across durations — shorter terms reduce rate risk; longer terms may offer higher headline yields if borrower quality supports it.',
      'Oxyile publishes platform announcements in your dashboard hub so you are never surprised by policy or feature changes during active negotiations.',
    ],
  },
  {
    slug: 'balanced-investor-portfolio-2026',
    title: 'Building a balanced investor portfolio in 2026',
    tag: 'Strategy',
    readTime: '8 min read',
    publishedAt: '3 May 2026',
    excerpt: 'Diversification, ticket sizing, and reinvestment discipline for retail P2P investors.',
    body: [
      'Treat each handshake as a single position. Spread capital across multiple borrowers, sectors, and durations instead of concentrating on one high-yield opportunity.',
      'Use the in-app chat to ask clarifying questions before approving terms. Good communication reduces disputes later.',
      'Reinvest returns on a schedule rather than reactively — this smooths cash flow and avoids emotional timing.',
      'Review the Admin-published contract status only if you are an operator; investors see payment progress inside their handshake cards once both sides have approved.',
    ],
  },
  {
    slug: 'web3-audit-trail-p2p',
    title: 'Why Web3 audit trails matter for P2P lending',
    tag: 'Web3',
    readTime: '7 min read',
    publishedAt: '28 Apr 2026',
    excerpt: 'On-chain handshake records complement fiat rails — they do not replace KYC or GoCardless collections.',
    body: [
      'Oxyile mints handshake metadata on Polygon Amoy after both parties approve and the borrower links a UK bank mandate. The hash becomes a tamper-evident reference for admins and counterparties.',
      'Web3 here is an audit layer, not a replacement for regulated fiat movement. EMIs still flow through GoCardless Direct Debit.',
      'Investors should still perform diligence in chat before approving terms shown on the handshake card.',
    ],
  },
  {
    slug: 'gocardless-emi-automation',
    title: 'GoCardless and automated EMI collections explained',
    tag: 'Payments',
    readTime: '5 min read',
    publishedAt: '25 Apr 2026',
    excerpt: 'How borrowers authorise mandates and how Oxyile schedules monthly subscriptions after contract activation.',
    body: [
      'After dual approval, borrowers complete a hosted GoCardless Billing Request Flow to authorise BACS Direct Debit.',
      'When the mandate is active, Oxyile creates a subscription matching the EMI amount and loan duration shown on the handshake card.',
      'Failed collections follow GoCardless retry rules; borrowers should keep sufficient funds and update bank details if needed.',
    ],
  },
  {
    slug: 'smart-contract-handshake-flow',
    title: 'Inside the Oxyile smart-contract handshake flow',
    tag: 'Product',
    readTime: '6 min read',
    publishedAt: '22 Apr 2026',
    excerpt: 'From in-chat proposal to “Bank Linked, Contract Minted, Auto-EMI Active” in one guided journey.',
    body: [
      'Lenders and borrowers negotiate in real-time chat, then send a handshake card with amount, rate, duration, EMI, and total return.',
      'Dual approval triggers borrower bank linking, Polygon mint via executeHandshake, and subscription creation for recurring EMIs.',
      'The card surfaces live status: Bank Linked, Smart Contract Minted, and Auto-EMI Active when all rails are green.',
    ],
  },
  {
    slug: 'kyc-trust-p2p-platforms',
    title: 'KYC and trust signals on modern P2P platforms',
    tag: 'Compliance',
    readTime: '5 min read',
    publishedAt: '18 Apr 2026',
    excerpt: 'Manual review, document vaults, and role separation keep retail and admin experiences safely isolated.',
    body: [
      'Oxyile requires identity and address verification at signup, with additional borrower or investor attestations by role.',
      'Admins review submissions in a dedicated portal; until approval, users remain on pending verification.',
      'Admin profiles and comms are invisible to retail users, reducing social engineering risk.',
    ],
  },
  {
    slug: 'fintech-ux-glassmorphism',
    title: 'Designing premium fintech UX with glassmorphism',
    tag: 'Design',
    readTime: '4 min read',
    publishedAt: '14 Apr 2026',
    excerpt: 'Transparent layers, motion, and mobile-first nav make complex lending flows feel approachable.',
    body: [
      'Oxyile uses glass cards atop a living brand background so data-heavy screens still feel light.',
      'Bottom navigation keeps chat, hub, and settings one thumb away on phones.',
      'Framer Motion stagger on editorial content reinforces quality without distracting from numbers that matter.',
    ],
  },
  {
    slug: 'borrower-affordability-checklist',
    title: 'Borrower affordability checklist before you accept a loan',
    tag: 'Borrowing',
    readTime: '6 min read',
    publishedAt: '10 Apr 2026',
    excerpt: 'Stress-test EMI against rent, bills, and emergencies before tapping Approve on a handshake.',
    body: [
      'Use the EMI and total return on the card as your baseline — then add headroom for rate changes and life events.',
      'Disclose income and expenses honestly during KYC; investors price risk with the data you provide.',
      'If EMIs strain your budget, negotiate a longer duration or smaller amount in chat before approving.',
    ],
  },
  {
    slug: 'investor-diversification-playbook',
    title: 'An investor diversification playbook for 2026',
    tag: 'Investing',
    readTime: '7 min read',
    publishedAt: '6 Apr 2026',
    excerpt: 'Ticket sizing, sector spread, and duration ladders for retail P2P portfolios on Oxyile.',
    body: [
      'Cap any single handshake at a fraction of your deployable capital — many small bets beat one heroic loan.',
      'Mix short and medium durations to balance liquidity and yield.',
      'Use recommendations and chat to build a pipeline, but let handshake cards be your term sheet.',
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getAllPostSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug);
}
