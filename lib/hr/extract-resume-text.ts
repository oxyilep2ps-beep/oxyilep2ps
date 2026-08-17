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

function copyBytes(buffer: Buffer): Uint8Array {
  return Uint8Array.from(buffer);
}

function looksLikePdfNoise(text: string): boolean {
  const sample = text.slice(0, 2000);
  const operators = (sample.match(/\b(endobj|endstream|obj|stream|BT|ET)\b/g) || []).length;
  const dictKeys = (sample.match(/\/(Type|Font|Length|Filter|Subtype|Resources|MediaBox)\b/g) || []).length;
  return operators + dictKeys >= 8;
}

function isUsefulResumeText(text: string): boolean {
  const cleaned = String(text ?? '')
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 20) return false;
  if (looksLikePdfNoise(cleaned)) return false;
  const letters = (cleaned.match(/[a-zA-Z]/g) || []).length;
  return letters >= 16;
}

function normalizeExtracted(text: string): string {
  return String(text ?? '')
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function extractPdfLiteralStrings(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  const pieces: string[] = [];
  const re = /\((?:\\.|[^\\)]){4,}\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    const inner = match[0]
      .slice(1, -1)
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\[0-7]{1,3}/g, ' ')
      .replace(/\\./g, ' ');
    if (/[a-zA-Z]{3,}/.test(inner)) pieces.push(inner);
    if (pieces.length > 800) break;
  }
  return pieces.join(' ').replace(/\s+/g, ' ').trim();
}

async function extractPdfWithUnpdf(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(copyBytes(buffer), {
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
    disableWorker: true,
  } as never);
  const result = await extractText(pdf, { mergePages: true });
  return normalizeExtracted(String(result.text ?? ''));
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const extractRawText = mammoth.extractRawText ?? mammoth.default?.extractRawText;
  if (!extractRawText) return '';
  const result = await extractRawText({ buffer });
  return normalizeExtracted(String(result.value ?? ''));
}

function isPdfBuffer(buffer: Buffer, fileName: string, mimeType: string): boolean {
  if (buffer.slice(0, 4).toString('utf8') === '%PDF') return true;
  if (buffer.slice(0, 2).toString('utf8') === 'PK') return false;
  const name = fileName.toLowerCase();
  return mimeType.includes('pdf') || name.endsWith('.pdf');
}

function isDocxBuffer(buffer: Buffer, fileName: string, mimeType: string): boolean {
  const name = fileName.toLowerCase();
  if (mimeType.includes('wordprocessingml') || name.endsWith('.docx')) return true;
  if (buffer.slice(0, 2).toString('utf8') !== 'PK') return false;
  return buffer.slice(0, 200_000).toString('latin1').includes('word/');
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

  if (isPdfBuffer(buffer, fileName, mimeType)) {
    try {
      const text = await withTimeout(extractPdfWithUnpdf(buffer), 12_000, 'unpdf');
      console.log('[ats] unpdf chars', text.length, text.slice(0, 400));
      if (isUsefulResumeText(text)) {
        console.log('[ats] extracted PDF text preview', text.slice(0, 800));
        return text;
      }
    } catch (err) {
      console.error('[ats] unpdf failed', err);
    }

    const literals = extractPdfLiteralStrings(buffer);
    console.log('[ats] pdf-literals chars', literals.length, literals.slice(0, 400));
    if (isUsefulResumeText(literals)) return literals;
  }

  if (isDocxBuffer(buffer, fileName, mimeType) || buffer.slice(0, 2).toString('utf8') === 'PK') {
    try {
      const text = await withTimeout(extractDocxText(buffer), 8_000, 'mammoth');
      console.log('[ats] extracted DOCX text preview', text.slice(0, 800));
      if (isUsefulResumeText(text)) return text;
    } catch (err) {
      console.error('[ats] mammoth DOCX extract failed', err);
    }
  }

  const scanned = extractPrintableStrings(buffer);
  console.warn('[ats] binary string scan fallback', { chars: scanned.length, preview: scanned.slice(0, 400) });
  return isUsefulResumeText(scanned) ? scanned : '';
}
