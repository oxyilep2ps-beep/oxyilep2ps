import 'server-only';

function extractPrintableStrings(buffer: Buffer): string {
  const chunks: string[] = [];
  let current = '';
  const pushCurrent = () => {
    if (current.length >= 4) chunks.push(current);
    current = '';
  };

  for (let i = 0; i < buffer.length; i += 1) {
    const code = buffer[i] ?? 0;
    const printable = code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126);
    if (printable) {
      current += String.fromCharCode(code);
    } else {
      pushCurrent();
    }
  }
  pushCurrent();
  return chunks.join(' ').replace(/\s+/g, ' ').trim();
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = String(result?.text ?? '').replace(/\s+/g, ' ').trim();
    console.log('[ats] pdf-parse pages/text', {
      pages: result?.total ?? result?.pages?.length,
      chars: text.length,
    });
    return text;
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractPdfTextFallback(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const result = await extractText(pdf, { mergePages: true });
  return String(result.text ?? '').replace(/\s+/g, ' ').trim();
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const extractRawText = mammoth.extractRawText ?? mammoth.default?.extractRawText;
  if (!extractRawText) return extractPrintableStrings(buffer);
  const result = await extractRawText({ buffer });
  return String(result.value ?? '').replace(/\s+/g, ' ').trim();
}

function looksLikePdf(buffer: Buffer, fileName: string, mimeType: string): boolean {
  const name = fileName.toLowerCase();
  if (mimeType.includes('pdf') || name.endsWith('.pdf')) return true;
  return buffer.slice(0, 5).toString('utf8') === '%PDF-';
}

function looksLikeDocx(fileName: string, mimeType: string): boolean {
  const name = fileName.toLowerCase();
  return mimeType.includes('wordprocessingml') || name.endsWith('.docx');
}

export async function extractResumeText(
  buffer: Buffer,
  meta?: { fileName?: string; mimeType?: string }
): Promise<string> {
  const fileName = String(meta?.fileName ?? '').toLowerCase();
  const mimeType = String(meta?.mimeType ?? '').toLowerCase();
  console.log('[ats] extractResumeText start', {
    fileName,
    mimeType,
    bytes: buffer.length,
    header: buffer.slice(0, 8).toString('utf8'),
  });

  if (looksLikePdf(buffer, fileName, mimeType)) {
    try {
      const text = await extractPdfText(buffer);
      if (text.length >= 20) {
        console.log('[ats] extracted PDF text preview', text.slice(0, 800));
        return text;
      }
      console.warn('[ats] pdf-parse returned too little text, trying unpdf fallback', { chars: text.length });
    } catch (err) {
      console.error('[ats] pdf-parse failed', err);
    }
    try {
      const fallback = await extractPdfTextFallback(buffer);
      console.log('[ats] unpdf fallback chars', fallback.length, fallback.slice(0, 400));
      if (fallback.length >= 20) return fallback;
    } catch (err) {
      console.error('[ats] unpdf fallback failed', err);
    }
  }

  if (looksLikeDocx(fileName, mimeType)) {
    try {
      const text = await extractDocxText(buffer);
      console.log('[ats] extracted DOCX text preview', text.slice(0, 800));
      if (text.length >= 20) return text;
    } catch (err) {
      console.error('[ats] mammoth DOCX extract failed', err);
    }
  }

  const scanned = extractPrintableStrings(buffer);
  console.warn('[ats] binary string scan fallback', { chars: scanned.length, preview: scanned.slice(0, 400) });
  return scanned;
}
