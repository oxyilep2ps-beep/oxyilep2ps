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
  const { extractText } = await import('unpdf');
  const result = await extractText(new Uint8Array(buffer), { mergePages: true });
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
  if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) return true;
  return buffer.slice(0, 5).toString('utf8') === '%PDF-';
}

function looksLikeDocx(buffer: Buffer, fileName: string, mimeType: string): boolean {
  if (mimeType.includes('wordprocessingml') || fileName.endsWith('.docx')) return true;
  return buffer.slice(0, 2).toString('utf8') === 'PK' && fileName.endsWith('.docx');
}

export async function extractResumeText(
  buffer: Buffer,
  meta?: { fileName?: string; mimeType?: string }
): Promise<string> {
  const fileName = String(meta?.fileName ?? '').toLowerCase();
  const mimeType = String(meta?.mimeType ?? '').toLowerCase();

  try {
    if (looksLikePdf(buffer, fileName, mimeType)) {
      const text = await extractPdfText(buffer);
      if (text.length >= 40) return text;
    }
    if (looksLikeDocx(buffer, fileName, mimeType) || fileName.endsWith('.doc')) {
      if (fileName.endsWith('.docx') || mimeType.includes('wordprocessingml')) {
        const text = await extractDocxText(buffer);
        if (text.length >= 40) return text;
      }
    }
  } catch {
    // Fall through to binary string scan so scoring still runs.
  }

  return extractPrintableStrings(buffer);
}

export async function extractResumeTextFromBlob(
  blob: Blob,
  meta?: { fileName?: string; mimeType?: string }
): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return extractResumeText(buffer, {
    fileName: meta?.fileName,
    mimeType: meta?.mimeType || blob.type,
  });
}
