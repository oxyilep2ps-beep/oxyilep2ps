import { jsPDF } from 'jspdf';
import type { Profile } from '@/lib/types/profile';

const BRAND = { r: 255, g: 90, b: 31 };
const DARK = { r: 25, g: 28, b: 36 };
const MUTED = { r: 97, g: 106, b: 121 };
const PAPER = { r: 255, g: 249, b: 245 };
const CARD = { r: 255, g: 255, b: 255 };
const LINE = { r: 255, g: 209, b: 190 };
const PAGE = { width: 210, height: 297, margin: 15 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const SAFE_BOTTOM = PAGE.height - 18;

function safeText(value: string | null | undefined, fallback = 'Not provided') {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function formatDate(value: string | null | undefined) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

function setText(doc: jsPDF, color = DARK) {
  doc.setTextColor(color.r, color.g, color.b);
}

function drawShell(doc: jsPDF) {
  doc.setFillColor(PAPER.r, PAPER.g, PAPER.b);
  doc.rect(0, 0, PAGE.width, PAGE.height, 'F');

  // Soft leaf/accent shapes to echo the app background without reducing legibility.
  doc.setFillColor(255, 235, 225);
  doc.circle(194, 22, 28, 'F');
  doc.circle(12, 260, 20, 'F');
  doc.setDrawColor(255, 203, 180);
  doc.setLineWidth(0.2);
  doc.line(PAGE.margin, PAGE.height - 14, PAGE.width - PAGE.margin, PAGE.height - 14);
}

function addFooter(doc: jsPDF) {
  const count = doc.getNumberOfPages();
  for (let page = 1; page <= count; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(116, 116, 116);
    doc.text('Oxyile Certified User Network', PAGE.margin, PAGE.height - 8);
    doc.text(`Page ${page} of ${count}`, PAGE.width - PAGE.margin, PAGE.height - 8, { align: 'right' });
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed <= SAFE_BOTTOM) return y;
  doc.addPage();
  drawShell(doc);
  return PAGE.margin;
}

function drawHeader(doc: jsPDF, users: Profile[]) {
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.roundedRect(PAGE.margin, 14, CONTENT_WIDTH, 36, 6, 6, 'F');

  doc.setFillColor(255, 255, 255);
  doc.circle(PAGE.margin + 15, 32, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text('O', PAGE.margin + 11.7, 37.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('Oxyile Certified User Network', PAGE.margin + 29, 29);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Verified borrowers and investors approved by compliance', PAGE.margin + 29, 38);

  const borrowers = users.filter((u) => u.role === 'BORROWER').length;
  const investors = users.filter((u) => u.role === 'INVESTOR').length;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(PAGE.margin, 58, CONTENT_WIDTH, 24, 5, 5, 'F');
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.roundedRect(PAGE.margin, 58, CONTENT_WIDTH, 24, 5, 5, 'S');

  const summary = [
    ['Total Approved', String(users.length)],
    ['Borrowers', String(borrowers)],
    ['Investors', String(investors)],
    ['Generated', formatDate(new Date().toISOString())],
  ];

  summary.forEach(([label, value], index) => {
    const x = PAGE.margin + 7 + index * 43;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(label.toUpperCase(), x, 68);
    doc.setFontSize(10);
    setText(doc);
    doc.text(value, x, 76, { maxWidth: 38 });
  });
}

function drawUserCard(doc: jsPDF, user: Profile, y: number) {
  const cardHeight = 42;
  const x = PAGE.margin;
  const name = safeText(user.full_legal_name, 'Verified user');
  const displayName = safeText(user.username ? `@${user.username.replace(/^@/, '')}` : user.bio, 'No display name set');

  doc.setFillColor(CARD.r, CARD.g, CARD.b);
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, CONTENT_WIDTH, cardHeight, 5, 5, 'FD');

  doc.setFillColor(255, 239, 231);
  doc.circle(x + 16, y + 21, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(initials(name), x + 16, y + 24.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText(doc);
  doc.text(name, x + 34, y + 13, { maxWidth: 76 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(`Display: ${displayName}`, x + 34, y + 21, { maxWidth: 78 });
  doc.text(`Email: ${safeText(user.email)}`, x + 34, y + 29, { maxWidth: 88 });
  doc.text(`Joined: ${formatDate(user.created_at)}`, x + 34, y + 37, { maxWidth: 80 });

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.roundedRect(x + CONTENT_WIDTH - 58, y + 10, 48, 10, 5, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text(`${user.role} • ${user.status}`, x + CONTENT_WIDTH - 34, y + 16.7, { align: 'center' });

  doc.setDrawColor(255, 225, 212);
  doc.roundedRect(x + CONTENT_WIDTH - 58, y + 25, 48, 9, 4, 4, 'S');
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setFontSize(7);
  doc.text('COMPLIANCE VERIFIED', x + CONTENT_WIDTH - 34, y + 31, { align: 'center' });
}

export function generateAdminApprovedUsersPDF(users: Profile[]) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  drawShell(doc);
  drawHeader(doc, users);

  let y = 94;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setText(doc);
  doc.text('Verified User Directory', PAGE.margin, y);
  y += 8;

  users.forEach((user) => {
    y = ensureSpace(doc, y, 50);
    drawUserCard(doc, user, y);
    y += 50;
  });

  if (users.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text('No approved users were available at export time.', PAGE.margin, y + 10);
  }

  addFooter(doc);
  doc.save(`Oxyile_Certified_User_Network_${new Date().toISOString().slice(0, 10)}.pdf`);
}
