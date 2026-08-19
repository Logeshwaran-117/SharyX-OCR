/**
 * services/extractText.js  (FIXED v2)
 *
 * Turns an uploaded file (PDF, Word, Excel, CSV, TXT, or image) into plain
 * text so the rest of the pipeline can work on it regardless of source format.
 *
 * KEY FIXES:
 *  1. Scanned/image-based PDFs (like Indian Bank statements) are detected via
 *     a chars-per-page heuristic and fall back to Gemini Vision OCR instead of
 *     returning empty text from pdf-parse.
 *  2. isEmptyContent() is now exported — summarizeController and
 *     tableController both import it from here.
 *
 * Works with either multer memoryStorage (file.buffer) or diskStorage
 * (file.path) — whichever your upload middleware is configured with.
 */
const fs   = require('fs');
const path = require('path');

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBuffer(file) {
  if (file.buffer) return file.buffer;
  if (file.path)   return fs.readFileSync(file.path);
  throw new Error('Uploaded file has neither buffer nor path.');
}

/**
 * Returns true when the extracted content is effectively empty.
 * Handles both plain strings (PDF/text path) and { isImage } objects
 * (image path returned by extractText for image files).
 */
function isEmptyContent(extracted) {
  if (!extracted) return true;
  if (typeof extracted === 'object' && extracted.isImage) {
    // Image objects always have content — let the AI decide if it's blank
    return false;
  }
  // Handle new {rawText, isScanned} PDF object
  if (typeof extracted === 'object' && typeof extracted.rawText === 'string') {
    return extracted.rawText.trim().length < 20;
  }
  return typeof extracted !== 'string' || extracted.trim().length < 20;
}

// ── Scanned-PDF detection ─────────────────────────────────────────────────────

/**
 * If pdf-parse returns very little text per page, the PDF is almost certainly
 * a scanned document (image-based pages with no embedded text layer).
 */
function isScannedPdf(text, pageCount) {
  if (!text || text.trim().length === 0) return true;
  const trimmed = text.trim();
  // If total extracted text is very short regardless of page count, treat as scanned
  if (trimmed.length < 50) return true;
  const avgCharsPerPage = trimmed.length / Math.max(pageCount || 1, 1);
  // Real text PDFs (including table-heavy bank statements): typically 200–3000+ chars/page.
  // Pure image/scanned PDFs with no text layer: < 50 chars/page.
  // Threshold raised from 100 → 50 to avoid falsely OCR-ing digital PDFs with sparse tables.
  return avgCharsPerPage < 50;
}

// ── OCR via Gemini Vision ─────────────────────────────────────────────────────

/**
 * Sends the PDF as a native inline document to Gemini Vision.
 * Gemini can read both digital text AND scanned/image pages natively.
 * Used as the fallback when pdf-parse returns near-empty text.
 */
/**
 * Sends the PDF as a native inline document to Gemini Vision.
 * Gemini can read both digital text AND scanned/image pages natively.
 * Used as the fallback when pdf-parse returns near-empty text.
 *
 * IMPORTANT: Gemini REST API requires snake_case keys:
 *   inline_data / mime_type  (NOT inlineData / mimeType)
 */
async function ocrPdfWithGemini(buffer) {
  const { callWithRotation, GEMINI_MODEL } = require('./geminiService');
  const base64 = buffer.toString('base64');

  // Rough size guard — Gemini inline limit is ~20 MB for the whole request
  const sizeMB = Buffer.byteLength(base64, 'utf8') / (1024 * 1024);
  if (sizeMB > 18) {
    console.warn(`[extractText] PDF base64 is ${sizeMB.toFixed(1)} MB — may exceed Gemini inline limit`);
  }

  console.log('[extractText] Scanned PDF — using Gemini Vision OCR...');

  const parts = [
    {
      inline_data: {
        mime_type: 'application/pdf',
        data: base64,
      },
    },
    {
      text:
        'You are a precise OCR engine. This PDF may be scanned or image-based.\n' +
        'Transcribe ALL readable text from EVERY page, in reading order.\n' +
        'Rules:\n' +
        '1. Do NOT summarize. Do NOT skip pages. Output every heading, paragraph, label, and number.\n' +
        '2. For tables: keep each row on one line; separate columns with " | ".\n' +
        '3. Preserve exact numbers, dates, percentages, codes, and currency amounts.\n' +
        '4. If a page is blank or unreadable, write "[Page N: unreadable]".\n' +
        '5. Return only the transcribed text — no commentary, no markdown fences.\n' +
        '6. For bank statements use: DATE | DESCRIPTION | DEBIT | CREDIT | BALANCE per row.',
    },
  ];

  // Higher token budget for multi-page OCR (was 8192 — often truncated)
  const text = await callWithRotation(
    () => parts,
    16384,
    GEMINI_MODEL,
    null,
    'summarize'
  );

  console.log(`[extractText] Gemini Vision OCR returned ${text?.length || 0} chars`);
  return (text && text.trim()) || '';
}

function looksLikeTablePdf(text) {
  const t = (text || '').toLowerCase();
  // Only treat as "scrambled bank table" when clearly a financial statement
  // AND pdf-parse destroyed row structure. Do NOT OCR long non-bank PDFs.
  const financial = /(ifsc|account number|opening balance|closing balance|upi|neft|imps|statement of account)/.test(t);
  if (!financial) return false;
  // A real row-preserving extraction puts amounts on the same line as a date.
  const rowsIntact = (text.match(/\d{2}\s+\w{3}\s+\d{4}[^\n]{10,}?[\d,]+\.\d{2}/g) || []).length;
  // Need substantial text that looks like a statement but almost no intact rows
  return text.trim().length > 200 && rowsIntact < 3;
}

// ── Per-format extractors ─────────────────────────────────────────────────────

async function extractFromPdf(buffer) {
  const pdfParse = require('pdf-parse');

  let pdfText  = '';
  let pageCount = 1;

  try {
    const data = await pdfParse(buffer);
    pdfText   = data.text    || '';
    pageCount = data.numpages || 1;
  } catch (err) {
    console.warn('[extractText] pdf-parse failed:', err.message);
  }

  const scanned = isScannedPdf(pdfText, pageCount);
  const scrambledBankTable = looksLikeTablePdf(pdfText);

  // Strong digital text layer and not a scrambled bank statement → use as-is
  if (!scanned && !scrambledBankTable) {
    console.log(`[extractText] pdf-parse OK — ${pdfText.length} chars from ${pageCount} pages`);
    return { rawText: pdfText, isScanned: false };
  }

  // Scanned, empty, or scrambled bank-table PDF — try Gemini Vision OCR
  console.log(
    `[extractText] Scanned or scrambled table PDF (${pdfText.trim().length} chars / ${pageCount} pages) — falling back to Gemini Vision OCR`
  );
  let ocrText = '';
  try {
    ocrText = await ocrPdfWithGemini(buffer);
  } catch (ocrErr) {
    console.warn('[extractText] Gemini OCR failed:', ocrErr.message);
  }

  // CRITICAL: never discard a richer pdf-parse result for a thin OCR dump.
  // Prefer whichever source has more usable content.
  const parseLen = (pdfText || '').trim().length;
  const ocrLen = (ocrText || '').trim().length;

  if (ocrLen > parseLen * 1.15 && ocrLen > 100) {
    console.log(`[extractText] Using OCR text (${ocrLen} chars > pdf-parse ${parseLen})`);
    return { rawText: ocrText, isScanned: true, reason: 'ocr-better' };
  }

  if (parseLen >= 200) {
    // Merge: keep pdf-parse body, append OCR if it adds unique material
    let merged = pdfText;
    if (ocrLen > 80 && ocrText.trim() !== pdfText.trim()) {
      merged = `${pdfText}\n\n=== OCR SUPPLEMENT ===\n${ocrText}`;
      console.log(`[extractText] Merged pdf-parse (${parseLen}) + OCR supplement (${ocrLen})`);
    } else {
      console.log(`[extractText] Keeping pdf-parse text (${parseLen} chars); OCR was weaker (${ocrLen})`);
    }
    return {
      rawText: merged,
      isScanned: scanned,
      reason: scrambledBankTable ? 'table-structure-partial' : 'pdf-parse-preferred',
    };
  }

  // Both thin — return whatever we have
  const best = ocrLen >= parseLen ? ocrText : pdfText;
  console.warn(`[extractText] Thin extraction — best source has ${best.trim().length} chars`);
  return { rawText: best || '', isScanned: true, reason: 'thin-source' };
}

async function extractFromDocx(buffer) {
  const mammoth = require('mammoth');
  const { value } = await mammoth.extractRawText({ buffer });
  return value || '';
}

async function extractFromExcel(buffer) {
  const XLSX = require('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  let out = '';
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    out += `--- Sheet: ${sheetName} ---\n${XLSX.utils.sheet_to_csv(sheet)}\n\n`;
  }
  return out;
}

/**
 * For image files we return a structured object instead of a plain string.
 * summarizeController checks extracted.isImage to pick the Vision path;
 * tableController does the same via extractTableFromImage.
 */
async function extractFromImage(buffer, mimeType) {
  const base64Data = buffer.toString('base64');
  // Return a special object so controllers know to use the Vision pipeline
  return { isImage: true, base64Data, mimeType };
}

function extractFromPlainText(buffer) {
  return buffer.toString('utf-8');
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * @param  {Express.Multer.File} file
 * @returns {Promise<string | { isImage: true, base64Data: string, mimeType: string }>}
 */
async function extractText(file) {
  const ext  = path.extname(file.originalname || '').toLowerCase();
  const mime = file.mimetype || '';
  const buf  = getBuffer(file);

  if (ext === '.pdf' || mime === 'application/pdf') {
    return extractFromPdf(buf);
  }

  if (
    ext === '.docx' || ext === '.doc' ||
    mime.includes('wordprocessingml') || mime === 'application/msword'
  ) {
    return extractFromDocx(buf);
  }

  if (
    ext === '.xlsx' || ext === '.xls' ||
    mime.includes('spreadsheetml') || mime === 'application/vnd.ms-excel'
  ) {
    return extractFromExcel(buf);
  }

  if (ext === '.csv' || mime === 'text/csv')   return extractFromPlainText(buf);
  if (ext === '.txt' || mime === 'text/plain') return extractFromPlainText(buf);

  if (
    ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ||
    mime.startsWith('image/')
  ) {
    return extractFromImage(buf, mime || `image/${ext.slice(1)}`);
  }

  throw new Error(`Unsupported file type: ${ext || mime}`);
}

module.exports = { extractText, isEmptyContent };