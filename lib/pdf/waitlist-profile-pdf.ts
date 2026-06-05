import { formatLtvRatio } from '@/lib/collateral/ltv';

export type WaitlistPdfRow = {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  role: string;
  target_amount?: number | null;
  expected_interest_rate?: number | null;
  borrower_source_of_income?: string | null;
  collateral_type?: string | null;
  collateral_value?: number | null;
  collateral_description?: string | null;
  waitlist_rank: number;
  questionnaire_answers: Record<string, string | boolean>;
  created_at: string;
};

export async function exportWaitlistProfilePdf(row: WaitlistPdfRow): Promise<void> {
  const [{ jsPDF }] = await Promise.all([import('jspdf')]);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const brand = { r: 255, g: 90, b: 31 };

  pdf.setFillColor(brand.r, brand.g, brand.b);
  pdf.rect(0, 0, 210, 36, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Oxyile Waitlist Profile', 14, 22);

  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(11);
  let y = 48;

  const lines: [string, string][] = [
    ['Waitlist Rank', `#${row.waitlist_rank}`],
    ['Name', row.name],
    ['Email', row.email],
    ['Phone', row.phone ?? 'Not provided'],
    ['Address', row.address ?? 'Not provided'],
    ['Postal Code', row.postal_code ?? 'Not provided'],
    ['Role', row.role === 'investor' ? 'Investor' : 'Borrower'],
    ['Target Amount', `£${Number(row.target_amount ?? 0).toLocaleString('en-GB')}`],
    ['Expected Interest Rate', `${Number(row.expected_interest_rate ?? 0).toLocaleString('en-GB')}%`],
    [
      'Source of Income',
      row.role === 'borrower'
        ? (row.borrower_source_of_income ??
          String((row.questionnaire_answers ?? {})['Source of Income'] ?? 'Not provided'))
        : String((row.questionnaire_answers ?? {})['Source of Income'] ?? 'Not provided'),
    ],
    ['Joined', new Date(row.created_at).toLocaleString('en-GB')],
  ];

  for (const [label, value] of lines) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, 14, y);
    pdf.setFont('helvetica', 'normal');
    const wrapped = pdf.splitTextToSize(value, 120) as string[];
    pdf.text(wrapped, 70, y);
    y += Math.max(8, wrapped.length * 5);
  }

  if (row.role === 'borrower') {
    y += 6;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(brand.r, brand.g, brand.b);
    pdf.text('SECURITY & COLLATERAL', 14, y);
    y += 8;
    pdf.setTextColor(30, 30, 30);
    pdf.setFont('helvetica', 'normal');

    const collateralLines: [string, string][] = [
      ['Collateral Type', row.collateral_type ?? 'Not provided'],
      ['Estimated Value', `£${Number(row.collateral_value ?? 0).toLocaleString('en-GB')}`],
      ['Description', row.collateral_description ?? 'Not provided'],
      [
        'LTV Ratio',
        formatLtvRatio(Number(row.target_amount ?? 0), Number(row.collateral_value ?? 0)),
      ],
    ];

    for (const [label, value] of collateralLines) {
      if (y > 265) {
        pdf.addPage();
        y = 20;
      }
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, 14, y);
      pdf.setFont('helvetica', 'normal');
      const wrapped = pdf.splitTextToSize(value, 120) as string[];
      pdf.text(wrapped, 70, y);
      y += Math.max(8, wrapped.length * 5);
    }
  }

  y += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(brand.r, brand.g, brand.b);
  pdf.text('Financial Profiling & Strategy', 14, y);
  y += 8;
  pdf.setTextColor(30, 30, 30);
  pdf.setFont('helvetica', 'normal');

  const entries = Object.entries(row.questionnaire_answers ?? {}).filter(
    ([question]) =>
      question !== 'Current Company/Employer' &&
      question !== 'current_company' &&
      question !== 'Desired Loan Limit Amount (GBP)'
  );
  if (entries.length === 0) {
    pdf.text('No questionnaire answers provided.', 14, y);
  } else {
    for (const [question, answer] of entries) {
      const answerText = typeof answer === 'boolean' ? (answer ? 'Yes' : 'No') : String(answer);
      if (y > 265) {
        pdf.addPage();
        y = 20;
      }
      pdf.setFillColor(255, 245, 240);
      pdf.roundedRect(12, y - 4, 186, 8, 2, 2, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.text(question, 14, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      const wrapped = pdf.splitTextToSize(answerText, 180) as string[];
      pdf.text(wrapped, 14, y);
      y += wrapped.length * 5 + 4;
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    }
  }

  pdf.save(`${row.name.replace(/[^a-z0-9]+/gi, '_')}_waitlist_profile.pdf`);
}
