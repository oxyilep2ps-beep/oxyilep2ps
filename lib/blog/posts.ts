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
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getAllPostSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug);
}
