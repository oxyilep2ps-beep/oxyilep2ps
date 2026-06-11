import { appendFcaDeedFooter } from '@/lib/pdf/fca-deed-footer';

export type PdfExportDocument = {
  label: string;
  url: string | null;
  kind: 'image' | 'pdf' | 'video' | 'other';
  error?: string;
};

export type PdfExportSection = {
  title: string;
  rows: [string, string][];
};

const PAGE_MARGIN_MM = 15;
const BLOCK_GAP_MM = 10;
const BRAND = { r: 255, g: 90, b: 31 };
const DARK = { r: 25, g: 28, b: 36 };
const MUTED = { r: 96, g: 104, b: 117 };
const PAPER = { r: 255, g: 249, b: 245 };
const LINE = { r: 255, g: 210, b: 190 };

async function loadImageDimensions(
  url: string
): Promise<{ width: number; height: number; dataUrl: string } | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          dataUrl,
        });
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  } catch {
    return null;
  }
}

function fitImageRect(
  naturalWidth: number,
  naturalHeight: number,
  maxWidthMm: number,
  maxHeightMm: number
): { widthMm: number; heightMm: number } {
  const aspect = naturalWidth / naturalHeight;
  let widthMm = maxWidthMm;
  let heightMm = widthMm / aspect;

  if (heightMm > maxHeightMm) {
    heightMm = maxHeightMm;
    widthMm = heightMm * aspect;
  }

  return { widthMm, heightMm };
}

function drawPageShell(pdf: import('jspdf').jsPDF, pageWidth: number, pageHeight: number) {
  pdf.setFillColor(PAPER.r, PAPER.g, PAPER.b);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  pdf.setFillColor(255, 235, 225);
  pdf.circle(pageWidth - 14, 18, 28, 'F');
  pdf.circle(12, pageHeight - 28, 18, 'F');
}

function drawHeader(
  pdf: import('jspdf').jsPDF,
  pageWidth: number,
  headerLines: string[]
) {
  const contentWidth = pageWidth - PAGE_MARGIN_MM * 2;
  pdf.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  pdf.roundedRect(PAGE_MARGIN_MM, 14, contentWidth, 34, 6, 6, 'F');

  pdf.setFillColor(255, 255, 255);
  pdf.circle(PAGE_MARGIN_MM + 15, 31, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  pdf.text('O', PAGE_MARGIN_MM + 11.8, 36.4);

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text('Oxyile Certified User Profile', PAGE_MARGIN_MM + 30, 29);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.text('Compliance-approved identity and KYC export', PAGE_MARGIN_MM + 30, 38);

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(LINE.r, LINE.g, LINE.b);
  pdf.roundedRect(PAGE_MARGIN_MM, 58, contentWidth, 34, 5, 5, 'FD');

  const rows = [
    ['Name', headerLines[0] ?? 'Verified user'],
    ['Email', headerLines[1] ?? 'Not provided'],
    ['Status', headerLines[2] ?? 'APPROVED'],
  ];

  rows.forEach(([label, value], index) => {
    const x = PAGE_MARGIN_MM + 7 + index * 58;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    pdf.text(label.toUpperCase(), x, 70);
    pdf.setFontSize(9.5);
    pdf.setTextColor(DARK.r, DARK.g, DARK.b);
    const lines = pdf.splitTextToSize(value, 50) as string[];
    pdf.text(lines.slice(0, 2), x, 78);
  });
}

/**
 * Export KYC dossier PDF with brand styling, labelled documents, correct aspect ratio,
 * and page-break checks so image/document blocks do not clip at page edges.
 */
export async function exportKycDossierPdf(params: {
  fileName: string;
  headerHtml: string;
  sections?: PdfExportSection[];
  documents: PdfExportDocument[];
}): Promise<void> {
  const [{ jsPDF }] = await Promise.all([import('jspdf')]);

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN_MM * 2;
  const maxImageHeight = pageHeight - PAGE_MARGIN_MM * 2 - 28;

  const headerLines = params.headerHtml.split('\n').filter(Boolean);

  let y = PAGE_MARGIN_MM;
  const newPage = () => {
    pdf.addPage();
    drawPageShell(pdf, pageWidth, pageHeight);
    y = PAGE_MARGIN_MM;
  };
  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - PAGE_MARGIN_MM - 8) {
      newPage();
    }
  };

  drawPageShell(pdf, pageWidth, pageHeight);
  drawHeader(pdf, pageWidth, headerLines);
  y = 108;

  const drawSection = (section: PdfExportSection) => {
    const headerHeight = 12;
    const rowLineHeight = 4.6;
    const rowGap = 3;
    const rowHeights = section.rows.map(([label, value]) => {
      const labelLines = pdf.splitTextToSize(label || 'Not provided', 58) as string[];
      const valueLines = pdf.splitTextToSize(value || 'Not provided', contentWidth - 76) as string[];
      return Math.max(labelLines.length, valueLines.length) * rowLineHeight + rowGap;
    });
    const blockHeight = headerHeight + rowHeights.reduce((sum, h) => sum + h, 0) + 7;

    ensureSpace(blockHeight);

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(LINE.r, LINE.g, LINE.b);
    pdf.roundedRect(PAGE_MARGIN_MM, y, contentWidth, blockHeight, 5, 5, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    pdf.text(section.title.toUpperCase(), PAGE_MARGIN_MM + 5, y + 8);

    y += headerHeight + 2;

    section.rows.forEach(([label, value], index) => {
      const rowHeight = rowHeights[index];
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.3);
      pdf.setTextColor(MUTED.r, MUTED.g, MUTED.b);
      pdf.text(pdf.splitTextToSize(label || 'Not provided', 58) as string[], PAGE_MARGIN_MM + 5, y);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.7);
      pdf.setTextColor(DARK.r, DARK.g, DARK.b);
      pdf.text(
        pdf.splitTextToSize(value || 'Not provided', contentWidth - 76) as string[],
        PAGE_MARGIN_MM + 70,
        y
      );

      y += rowHeight;
    });

    y += BLOCK_GAP_MM;
  };

  for (const section of params.sections ?? []) {
    drawSection(section);
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(DARK.r, DARK.g, DARK.b);
  pdf.text('Submitted Evidence', PAGE_MARGIN_MM, y);
  y += 8;

  for (const doc of params.documents) {
    const labelHeight = 16;

    if (doc.kind !== 'image' || !doc.url) {
      ensureSpace(labelHeight + 18);
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(LINE.r, LINE.g, LINE.b);
      pdf.roundedRect(PAGE_MARGIN_MM, y, contentWidth, labelHeight + 12, 4, 4, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(BRAND.r, BRAND.g, BRAND.b);
      pdf.text(doc.label, PAGE_MARGIN_MM + 5, y + 8);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(MUTED.r, MUTED.g, MUTED.b);
      pdf.text(doc.error ?? 'Document not available for inline PDF rendering', PAGE_MARGIN_MM + 5, y + 17);
      y += labelHeight + 20;
      continue;
    }

    const loaded = await loadImageDimensions(doc.url);
    if (!loaded) {
      ensureSpace(labelHeight + 14);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(BRAND.r, BRAND.g, BRAND.b);
      pdf.text(doc.label, PAGE_MARGIN_MM, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(MUTED.r, MUTED.g, MUTED.b);
      pdf.text('Could not render image', PAGE_MARGIN_MM, y);
      y += BLOCK_GAP_MM;
      continue;
    }

    const { widthMm, heightMm } = fitImageRect(loaded.width, loaded.height, contentWidth - 12, maxImageHeight);
    const blockHeight = heightMm + 25;

    ensureSpace(blockHeight);

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(LINE.r, LINE.g, LINE.b);
    pdf.roundedRect(PAGE_MARGIN_MM, y, contentWidth, blockHeight, 5, 5, 'FD');

    pdf.setFillColor(BRAND.r, BRAND.g, BRAND.b);
    pdf.roundedRect(PAGE_MARGIN_MM + 5, y + 5, 36, 8, 3, 3, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text('VERIFIED FILE', PAGE_MARGIN_MM + 23, y + 10.5, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setTextColor(DARK.r, DARK.g, DARK.b);
    pdf.text(doc.label, PAGE_MARGIN_MM + 46, y + 10.5, { maxWidth: contentWidth - 55 });

    const imageX = PAGE_MARGIN_MM + (contentWidth - widthMm) / 2;
    pdf.addImage(loaded.dataUrl, 'PNG', imageX, y + 18, widthMm, heightMm, undefined, 'FAST');
    y += blockHeight + BLOCK_GAP_MM;
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(116, 116, 116);
    pdf.text('Oxyile Certified User Profile', PAGE_MARGIN_MM, pageHeight - 8);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - PAGE_MARGIN_MM, pageHeight - 8, { align: 'right' });
  }

  appendFcaDeedFooter(pdf, { marginMm: PAGE_MARGIN_MM, pageWidthMm: pageWidth, footerLineY: pageHeight - 8 });
  pdf.save(params.fileName);
}
