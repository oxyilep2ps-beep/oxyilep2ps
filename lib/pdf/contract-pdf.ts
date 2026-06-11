import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MemberRole } from '@/lib/chat/types';
import { appendFcaDeedFooter } from '@/lib/pdf/fca-deed-footer';

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

const BRAND = { r: 255, g: 90, b: 31 };
const DARK = { r: 25, g: 28, b: 36 };
const MUTED = { r: 96, g: 104, b: 117 };
const PAPER = { r: 255, g: 249, b: 245 };
const LINE = { r: 255, g: 205, b: 185 };
const PAGE = { width: 210, height: 297, margin: 16 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const FOOTER_Y = PAGE.height - 10;
const SAFE_BOTTOM = PAGE.height - 20;

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
  if (!hash) return 'Pending verification';
  if (hash.startsWith('sandbox_')) return `Sandbox reference: ${hash}`;
  return `https://amoy.polygonscan.com/tx/${hash}`;
}

function fileSafe(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function setText(doc: jsPDF, color = DARK) {
  doc.setTextColor(color.r, color.g, color.b);
}

function addPageShell(doc: jsPDF, txnId: string) {
  doc.setFillColor(PAPER.r, PAPER.g, PAPER.b);
  doc.rect(0, 0, PAGE.width, PAGE.height, 'F');

  doc.setFillColor(255, 237, 228);
  doc.circle(188, 24, 30, 'F');
  doc.circle(18, 275, 22, 'F');

  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.setLineWidth(0.25);
  doc.line(PAGE.margin, FOOTER_Y - 4, PAGE.width - PAGE.margin, FOOTER_Y - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(116, 116, 116);
  doc.text(`Oxyile Digital Agreement | ${txnId}`, PAGE.margin, FOOTER_Y);
}

function addFooterPageNumbers(doc: jsPDF, txnId: string) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(116, 116, 116);
    doc.text(`Page ${page} of ${pageCount}`, PAGE.width - PAGE.margin, FOOTER_Y, { align: 'right' });
    doc.text(`Oxyile Digital Agreement | ${txnId}`, PAGE.margin, FOOTER_Y);
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number, txnId: string): number {
  if (y + needed <= SAFE_BOTTOM) return y;
  doc.addPage();
  addPageShell(doc, txnId);
  return PAGE.margin + 6;
}

function roundedPanel(doc: jsPDF, x: number, y: number, w: number, h: number, fill: [number, number, number]) {
  doc.setFillColor(...fill);
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, 4, 4, 'FD');
}

function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options?: { fontSize?: number; lineHeight?: number; color?: typeof DARK; bold?: boolean }
): number {
  doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
  doc.setFontSize(options?.fontSize ?? 9);
  setText(doc, options?.color ?? DARK);
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y);
  return y + lines.length * (options?.lineHeight ?? 4.5);
}

function addHeader(doc: jsPDF, txnId: string) {
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.roundedRect(PAGE.margin, 14, CONTENT_WIDTH, 31, 5, 5, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(PAGE.margin + 13, 29.5, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text('O', PAGE.margin + 10.1, 34);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(19);
  doc.text('Oxyile', PAGE.margin + 25, 27);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('P2P Digital Loan Agreement', PAGE.margin + 25, 36);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(txnId, PAGE.width - PAGE.margin - 5, 27, { align: 'right', maxWidth: 70 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Unique Transaction ID', PAGE.width - PAGE.margin - 5, 36, { align: 'right' });
}

function addMetadataSection(doc: jsPDF, contract: ContractPdfData, txnId: string, generatedAt: string): number {
  const y = 53;
  roundedPanel(doc, PAGE.margin, y, CONTENT_WIDTH, 32, [255, 255, 255]);

  const columns = [
    ['Transaction ID', txnId],
    ['Agreement Timestamp', printableDate(contract.created_at)],
    ['Generated Date', printableDate(generatedAt)],
  ];

  columns.forEach(([label, value], index) => {
    const x = PAGE.margin + 6 + index * 58;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(label.toUpperCase(), x, y + 10);
    writeWrapped(doc, value, x, y + 17, 51, { fontSize: 9.5, lineHeight: 4.3, bold: true });
  });

  return y + 42;
}

function addTable(
  doc: jsPDF,
  title: string,
  y: number,
  rows: string[][],
  txnId: string,
  options?: { darkHeader?: boolean; columnWidth?: number }
): number {
  y = ensureSpace(doc, y, 38, txnId);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setText(doc);
  doc.text(title, PAGE.margin, y);

  autoTable(doc, {
    startY: y + 5,
    head: [['Field', 'Details']],
    body: rows,
    margin: { left: PAGE.margin, right: PAGE.margin },
    tableWidth: CONTENT_WIDTH,
    theme: 'grid',
    rowPageBreak: 'avoid',
    pageBreak: 'auto',
    styles: {
      font: 'helvetica',
      fontSize: 8.8,
      cellPadding: { top: 3.5, right: 3.5, bottom: 3.5, left: 3.5 },
      overflow: 'linebreak',
      lineColor: [255, 215, 198],
      lineWidth: 0.25,
      textColor: [38, 42, 50],
      valign: 'middle',
      minCellHeight: 8,
    },
    headStyles: {
      fillColor: options?.darkHeader ? [25, 28, 36] : [BRAND.r, BRAND.g, BRAND.b],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      cellPadding: { top: 4, right: 3.5, bottom: 4, left: 3.5 },
    },
    alternateRowStyles: { fillColor: [255, 249, 245] },
    columnStyles: {
      0: { cellWidth: options?.columnWidth ?? 52, fontStyle: 'bold', textColor: [80, 86, 98] },
      1: { cellWidth: CONTENT_WIDTH - (options?.columnWidth ?? 52) },
    },
    didDrawPage: () => addPageShell(doc, txnId),
  });

  const lastY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 38;
  return lastY + 11;
}

function addBlockchainBlock(doc: jsPDF, y: number, contract: ContractPdfData, txnId: string): number {
  y = ensureSpace(doc, y, 52, txnId);
  const hash = contract.polygon_tx_hash ?? 'Pending';
  const verification = polygonUrl(contract.polygon_tx_hash);
  const blockHeight = 46;

  roundedPanel(doc, PAGE.margin, y, CONTENT_WIDTH, blockHeight, [255, 255, 255]);
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.roundedRect(PAGE.margin + 5, y + 6, 36, 8, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('POLYGON VERIFIED', PAGE.margin + 23, y + 11.3, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText(doc);
  doc.text('Blockchain Verification', PAGE.margin + 47, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text('Network: Polygon Amoy', PAGE.margin + 47, y + 18);

  const hashY = writeWrapped(doc, `Transaction Hash: ${hash}`, PAGE.margin + 6, y + 29, CONTENT_WIDTH - 12, {
    fontSize: 8.2,
    lineHeight: 4.2,
    color: DARK,
    bold: true,
  });
  writeWrapped(doc, verification, PAGE.margin + 6, hashY + 1, CONTENT_WIDTH - 12, {
    fontSize: 8,
    lineHeight: 4.1,
    color: BRAND,
  });

  return y + blockHeight + 11;
}

function scheduleRows(emi: number, duration: number): string[][] {
  return Array.from({ length: Math.max(1, duration) }, (_, i) => [
    `Month ${i + 1}`,
    money(emi),
    'GoCardless Direct Debit',
  ]);
}

export function generateContractPDF({ contract, perspective, mode = 'user' }: GenerateContractPdfOptions) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const txnId = contract.txn_id ?? `OXY-TXN-PENDING-${contract.id.slice(0, 8)}`;
  const emi = Number(contract.emi_amount ?? 0);
  const totalReturn = Number(contract.total_return ?? emi * contract.duration);
  const generatedAt = new Date().toISOString();

  addPageShell(doc, txnId);
  addHeader(doc, txnId);
  let y = addMetadataSection(doc, contract, txnId, generatedAt);

  y = addTable(
    doc,
    'Loan Terms',
    y,
    [
      ['Loan Amount', money(contract.amount)],
      ['Interest Rate', `${contract.rate}% p.a.`],
      ['Duration', `${contract.duration} months`],
      ['Monthly EMI', money(emi)],
      ['Total EMI / Return', money(totalReturn)],
      ['Contract Status', contract.status ?? 'ACTIVE'],
      ['Payment Status', contract.payment_status ?? 'PENDING'],
    ],
    txnId
  );

  y = addBlockchainBlock(doc, y, contract, txnId);

  const partyRows =
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

  y = addTable(doc, mode === 'admin' ? 'Master Party Data' : 'Party Summary', y, partyRows, txnId);

  if (perspective === 'BORROWER') {
    y = addTable(
      doc,
      'Borrower Repayment Schedule',
      y,
      [
        ['Mandate Reference', contract.mandate_id ?? 'Authorised mandate reference pending reconciliation'],
        ['Collection Method', 'GoCardless Direct Debit'],
        ['Repayment Frequency', 'Monthly'],
      ],
      txnId
    );

    y = ensureSpace(doc, y, 60, txnId);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setText(doc);
    doc.text('EMI Breakdown', PAGE.margin, y);
    autoTable(doc, {
      startY: y + 5,
      head: [['Installment', 'EMI', 'Collection Method']],
      body: scheduleRows(emi, contract.duration),
      margin: { left: PAGE.margin, right: PAGE.margin },
      tableWidth: CONTENT_WIDTH,
      rowPageBreak: 'avoid',
      pageBreak: 'auto',
      styles: {
        fontSize: 8.2,
        cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
        overflow: 'linebreak',
        lineColor: [255, 215, 198],
        lineWidth: 0.2,
      },
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 249, 245] },
      didDrawPage: () => addPageShell(doc, txnId),
    });
  } else if (perspective === 'INVESTOR') {
    addTable(
      doc,
      'Investor Return Overview',
      y,
      [
        ['Principal Deployed', money(contract.amount)],
        ['Expected Total Return', money(totalReturn)],
        ['Estimated Interest Earned', money(totalReturn - contract.amount)],
        ['Borrower', contract.borrower_name ?? contract.counterparty_name ?? 'Verified borrower'],
        ['Borrower Public Handle', contract.counterparty_username ?? 'Not set'],
      ],
      txnId
    );
  } else {
    addTable(
      doc,
      'Admin Master Contract View',
      y,
      [
        ['Transaction ID', txnId],
        ['Handshake ID', contract.id],
        ['Lender', `${contract.lender_name ?? 'Unknown'} (${contract.lender_id ?? 'n/a'})`],
        ['Borrower', `${contract.borrower_name ?? 'Unknown'} (${contract.borrower_id ?? 'n/a'})`],
        ['GoCardless Mandate', contract.mandate_id ?? 'Pending'],
        ['Subscription', contract.gocardless_subscription_id ?? 'Pending'],
        ['Polygon Tx', contract.polygon_tx_hash ?? 'Pending'],
      ],
      txnId,
      { darkHeader: true, columnWidth: 48 }
    );
  }

  addFooterPageNumbers(doc, txnId);
  appendFcaDeedFooter(doc, { marginMm: PAGE.margin, pageWidthMm: PAGE.width, footerLineY: FOOTER_Y });
  doc.save(`${fileSafe(txnId)}-oxyile-contract.pdf`);
}
