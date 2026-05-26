import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MemberRole } from '@/lib/chat/types';

export type ContractPdfMode = 'user' | 'admin';

export type ContractPdfData = {
  id: string;
  txn_id?: string | null;
  lender_id?: string;
  borrower_id?: string;
  lender_name?: string | null;
  borrower_name?: string | null;
  current_user_name?: string | null;
  current_user_email?: string | null;
  counterparty_name?: string | null;
  counterparty_username?: string | null;
  amount: number;
  rate: number;
  duration: number;
  emi_amount?: number | null;
  total_return?: number | null;
  polygon_tx_hash?: string | null;
  mandate_id?: string | null;
  gocardless_subscription_id?: string | null;
  payment_status?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type GenerateContractPdfOptions = {
  contract: ContractPdfData;
  perspective: MemberRole | 'ADMIN';
  mode?: ContractPdfMode;
};

function money(value: number | null | undefined): string {
  return `GBP ${Number(value ?? 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function printableDate(value: string | null | undefined): string {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function polygonUrl(hash: string | null | undefined): string {
  if (!hash) return 'Pending';
  if (hash.startsWith('sandbox_')) return `Sandbox reference: ${hash}`;
  return `https://amoy.polygonscan.com/tx/${hash}`;
}

function fileSafe(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function addFooter(doc: jsPDF, txnId: string) {
  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Oxyile P2P Digital Agreement | ${txnId} | Page ${page} of ${pageCount}`,
      14,
      287
    );
  }
}

function scheduleRows(emi: number, duration: number): string[][] {
  return Array.from({ length: Math.max(1, duration) }, (_, i) => [
    `Month ${i + 1}`,
    money(emi),
    'GoCardless Direct Debit',
  ]);
}

export function generateContractPDF({ contract, perspective, mode = 'user' }: GenerateContractPdfOptions) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const txnId = contract.txn_id ?? `OXY-TXN-PENDING-${contract.id.slice(0, 8)}`;
  const emi = Number(contract.emi_amount ?? 0);
  const totalReturn = Number(contract.total_return ?? emi * contract.duration);
  const generatedAt = new Date().toISOString();

  doc.setFillColor(255, 90, 31);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Oxyile', 14, 14);
  doc.setFontSize(12);
  doc.text('P2P Digital Loan Agreement', 14, 23);

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Transaction ID: ${txnId}`, 14, 42);
  doc.text(`Agreement Timestamp: ${printableDate(contract.created_at)}`, 14, 48);
  doc.text(`Generated: ${printableDate(generatedAt)}`, 14, 54);

  autoTable(doc, {
    startY: 64,
    head: [['Loan Terms', 'Value']],
    body: [
      ['Loan Amount', money(contract.amount)],
      ['Interest Rate', `${contract.rate}% p.a.`],
      ['Duration', `${contract.duration} months`],
      ['Monthly EMI', money(emi)],
      ['Total EMI / Return', money(totalReturn)],
      ['Contract Status', contract.status ?? 'ACTIVE'],
      ['Payment Status', contract.payment_status ?? 'PENDING'],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [255, 90, 31], textColor: 255 },
  });

  autoTable(doc, {
    startY: 126,
    head: [['Blockchain Verification', 'Value']],
    body: [
      ['Network', 'Polygon Amoy'],
      ['Verification', polygonUrl(contract.polygon_tx_hash)],
      ['Transaction Hash', contract.polygon_tx_hash ?? 'Pending'],
    ],
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [20, 20, 20], textColor: 255 },
    columnStyles: { 1: { cellWidth: 125 } },
  });

  const partyRows: string[][] =
    mode === 'admin'
      ? [
          ['Lender', `${contract.lender_name ?? 'Unknown'} (${contract.lender_id ?? 'n/a'})`],
          ['Borrower', `${contract.borrower_name ?? 'Unknown'} (${contract.borrower_id ?? 'n/a'})`],
          ['GoCardless Mandate', contract.mandate_id ?? 'Pending'],
          ['Subscription', contract.gocardless_subscription_id ?? 'Pending'],
        ]
      : [
          ['Your Role', perspective],
          ['Your Name', contract.current_user_name ?? 'Oxyile user'],
          ['Your Email', contract.current_user_email ?? 'Not disclosed'],
          ['Counterparty', contract.counterparty_name ?? 'Verified counterparty'],
          ['Counterparty Handle', contract.counterparty_username ?? 'Not set'],
        ];

  autoTable(doc, {
    startY: 180,
    head: [[mode === 'admin' ? 'Master Party Data' : 'Party Summary', 'Value']],
    body: partyRows,
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [255, 90, 31], textColor: 255 },
    columnStyles: { 1: { cellWidth: 125 } },
  });

  doc.addPage();
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);

  if (perspective === 'BORROWER') {
    doc.text('Borrower Repayment Schedule', 14, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(
      `GoCardless mandate: ${contract.mandate_id ?? 'Authorised mandate reference pending reconciliation'}`,
      14,
      27
    );
    autoTable(doc, {
      startY: 36,
      head: [['Installment', 'EMI', 'Collection Method']],
      body: scheduleRows(emi, contract.duration),
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [255, 90, 31], textColor: 255 },
    });
  } else if (perspective === 'INVESTOR') {
    doc.text('Investor Return Overview', 14, 18);
    autoTable(doc, {
      startY: 28,
      head: [['Metric', 'Value']],
      body: [
        ['Principal Deployed', money(contract.amount)],
        ['Expected Total Return', money(totalReturn)],
        ['Estimated Interest Earned', money(totalReturn - contract.amount)],
        ['Borrower', contract.borrower_name ?? contract.counterparty_name ?? 'Verified borrower'],
        ['Borrower Public Handle', contract.counterparty_username ?? 'Not set'],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [255, 90, 31], textColor: 255 },
    });
  } else {
    doc.text('Admin Master Contract View', 14, 18);
    autoTable(doc, {
      startY: 28,
      head: [['Field', 'Value']],
      body: [
        ['Transaction ID', txnId],
        ['Handshake ID', contract.id],
        ['Lender', `${contract.lender_name ?? 'Unknown'} (${contract.lender_id ?? 'n/a'})`],
        ['Borrower', `${contract.borrower_name ?? 'Unknown'} (${contract.borrower_id ?? 'n/a'})`],
        ['GoCardless Mandate', contract.mandate_id ?? 'Pending'],
        ['Subscription', contract.gocardless_subscription_id ?? 'Pending'],
        ['Polygon Tx', contract.polygon_tx_hash ?? 'Pending'],
      ],
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [20, 20, 20], textColor: 255 },
      columnStyles: { 1: { cellWidth: 130 } },
    });
  }

  addFooter(doc, txnId);
  doc.save(`${fileSafe(txnId)}-oxyile-contract.pdf`);
}
