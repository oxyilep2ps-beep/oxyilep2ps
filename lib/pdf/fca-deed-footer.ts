import type { jsPDF } from 'jspdf';

/** Hardcoded FCA deed-of-charge clause — Phase 21 legal footer requirement. */
export const FCA_DEED_OF_CHARGE_TEXT =
  'DEED OF CHARGE: By digitally signing this document, the Borrower and/or Guarantor grants Oxyile full legal rights to register a charge over the pledged collateral in the event of a default. Defaulting will result in immediate reporting to Credit Reference Agencies (Experian, Equifax, TransUnion) under UK Law.';

type FcaFooterOptions = {
  marginMm?: number;
  pageWidthMm?: number;
  footerLineY?: number;
  fontSize?: number;
};

/** Renders the FCA deed clause above the standard footer on every page. */
export function appendFcaDeedFooter(doc: jsPDF, options: FcaFooterOptions = {}): void {
  const margin = options.marginMm ?? 14;
  const pageWidth = options.pageWidthMm ?? 210;
  const footerLineY = options.footerLineY ?? 287;
  const fontSize = options.fontSize ?? 6.5;
  const maxWidth = pageWidth - margin * 2;
  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(80, 40, 30);
    const lines = doc.splitTextToSize(FCA_DEED_OF_CHARGE_TEXT, maxWidth) as string[];
    let y = footerLineY - 4 - lines.length * 3.2;
    for (const line of lines) {
      doc.text(line, margin, y);
      y += 3.2;
    }
  }
}
