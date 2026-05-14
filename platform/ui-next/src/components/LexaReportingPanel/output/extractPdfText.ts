/**
 * @author Sanjay Balai
 * @description Browser-side PDF text extraction for Lexa's Correct flow.
 * Loads pdfjs-dist via dynamic import (so it only ships in the chunks of
 * users who actually upload a PDF), validates page count, and returns the
 * concatenated text content of every page.
 *
 * Returned text is the raw extracted plain text — formatting (bold,
 * headings, bullets) is lost. The caller drops it into the Report textarea
 * so the student can edit/correct before clicking "Review".
 */

const MAX_PAGES = 10;
const PDFJS_WORKER_VERSION = '3.11.174';
// CDN worker URL kept in sync with the pdfjs-dist version pinned in
// platform/ui-next/package.json. If you bump the dep, bump this too.
const PDFJS_WORKER_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_WORKER_VERSION}/pdf.worker.min.js`;

export class PdfExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfExtractionError';
  }
}

export const extractPdfText = async (file: File): Promise<string> => {
  if (!file) {
    throw new PdfExtractionError('No file provided.');
  }
  if (file.type !== 'application/pdf') {
    throw new PdfExtractionError('Only PDF files are supported.');
  }

  // Dynamic import keeps pdfjs-dist out of the main bundle. It's only
  // pulled when the student actually uploads a PDF.
  let pdfjsLib: any;
  try {
    pdfjsLib = await import('pdfjs-dist');
  } catch (err) {
    throw new PdfExtractionError(
      'PDF support is not installed. Run "yarn install" in OHIF/platform/ui-next to add pdfjs-dist.'
    );
  }

  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
  }

  const arrayBuffer = await file.arrayBuffer();

  let pdf: any;
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (err: any) {
    throw new PdfExtractionError(
      err?.message ? `Could not parse PDF: ${err.message}` : 'Could not parse PDF.'
    );
  }

  if (pdf.numPages > MAX_PAGES) {
    throw new PdfExtractionError(
      `PDF has ${pdf.numPages} pages — please upload a file with ${MAX_PAGES} or fewer pages.`
    );
  }

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    // pdfjs returns an array of TextItem objects; .str holds the raw
    // visible text. Joining with a space preserves word boundaries; the
    // visible line breaks are reconstructed by inserting a newline
    // whenever the y-coordinate changes (handled below).
    const lines: string[] = [];
    let currentLineY: number | null = null;
    let buffer: string[] = [];
    for (const item of content.items as any[]) {
      const y = Array.isArray(item.transform) ? item.transform[5] : null;
      if (currentLineY === null || y === currentLineY) {
        buffer.push(item.str);
      } else {
        lines.push(buffer.join(' ').trim());
        buffer = [item.str];
      }
      currentLineY = y;
    }
    if (buffer.length > 0) {
      lines.push(buffer.join(' ').trim());
    }
    pageTexts.push(lines.filter(Boolean).join('\n'));
  }

  return pageTexts
    .join('\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
