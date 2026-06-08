export const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/blogs', label: 'Blogs' },
  { href: '/investors', label: 'Investors' },
  { href: '/waitlist', label: 'Waitlist' },
  { href: '/careers', label: 'Careers' },
  { href: '/raise-complaint', label: 'Raise a Complaint' },
  { href: '/contact', label: 'Contact' },
];

export type FooterLink = { label: string; href: string };

export const footerColumns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Platform',
    links: [
      { label: 'How It Works', href: '/about#how' },
      { label: 'Investors', href: '/investors' },
      { label: 'Borrowers', href: '/waitlist' },
      { label: 'Join Waitlist', href: '/waitlist' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blogs', href: '/blogs' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Raise a Complaint', href: '/raise-complaint' },
      { label: 'Security', href: '/security' },
      { label: 'Compliance', href: '/terms' },
      { label: 'FAQs', href: '/about#how' },
    ],
  },
];
