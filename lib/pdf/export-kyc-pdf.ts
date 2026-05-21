export type PdfExportDocument = {
  label: string;
  url: string | null;
  kind: 'image' | 'pdf' | 'video' | 'other';
  error?: string;
};

const PAGE_MARGIN_MM = 14;
const LABEL_GAP_MM = 4;
const BLOCK_GAP_MM = 10;

async function loadImageDimensions(
  url: string
): Promise<{ width: number; height: number; dataUrl: string } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        dataUrl: canvas.toDataURL('image/png'),
      });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
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

/**
 * Export KYC dossier PDF with labelled images, correct aspect ratio, and no page splits.
 */
export async function exportKycDossierPdf(params: {
  fileName: string;
  headerHtml: string;
  documents: PdfExportDocument[];
}): Promise<void> {
  const [{ jsPDF }] = await Promise.all([import('jspdf')]);

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN_MM * 2;
  const maxImageHeight = pageHeight - PAGE_MARGIN_MM * 2 - 18;

  let y = PAGE_MARGIN_MM;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - PAGE_MARGIN_MM) {
      pdf.addPage();
      y = PAGE_MARGIN_MM;
    }
  };

  const headerLines = params.headerHtml.split('\n').filter(Boolean);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(headerLines[0] ?? 'Oxyile KYC Dossier', PAGE_MARGIN_MM, y);
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  for (const line of headerLines.slice(1)) {
    ensureSpace(6);
    pdf.text(line, PAGE_MARGIN_MM, y);
    y += 5;
  }

  y += BLOCK_GAP_MM;

  for (const doc of params.documents) {
    const labelBlockHeight = 12;

    if (doc.kind !== 'image' || !doc.url) {
      ensureSpace(labelBlockHeight + 20);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(doc.label, PAGE_MARGIN_MM, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(doc.error ?? 'Document not available for export', PAGE_MARGIN_MM, y);
      y += BLOCK_GAP_MM;
      continue;
    }

    const loaded = await loadImageDimensions(doc.url);
    if (!loaded) {
      ensureSpace(labelBlockHeight + 16);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(doc.label, PAGE_MARGIN_MM, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text('Could not render image', PAGE_MARGIN_MM, y);
      y += BLOCK_GAP_MM;
      continue;
    }

    const { widthMm, heightMm } = fitImageRect(loaded.width, loaded.height, contentWidth, maxImageHeight);
    const blockHeight = heightMm + LABEL_GAP_MM + labelBlockHeight;

    ensureSpace(blockHeight);

    const imageX = PAGE_MARGIN_MM + (contentWidth - widthMm) / 2;
    pdf.addImage(loaded.dataUrl, 'PNG', imageX, y, widthMm, heightMm, undefined, 'FAST');
    y += heightMm + LABEL_GAP_MM;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(doc.label, PAGE_MARGIN_MM, y);
    y += BLOCK_GAP_MM;
  }

  pdf.save(params.fileName);
}
