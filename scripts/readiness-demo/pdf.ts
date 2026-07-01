import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

/**
 * Tiny PDF generator for the demo package. Produces clean, multi-page A4 PDFs
 * with a real text layer, so the app's normal `unpdf` parser extracts the text
 * and the readiness assessor retrieves genuine, citable evidence (page numbers
 * included). No OCR path is needed.
 */

export interface PageSpec {
  heading: string;
  body: string[]; // one entry per paragraph
}

export interface DocSpec {
  fileName: string;
  title: string;
  pages: PageSpec[];
}

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;
const INK = rgb(0.13, 0.14, 0.16);
const MUTED = rgb(0.45, 0.47, 0.5);
const RULE = rgb(0.8, 0.82, 0.85);

/** Greedy word-wrap to a pixel width for a given font + size. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function makePdf(doc: DocSpec): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(doc.title);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  doc.pages.forEach((spec, index) => {
    const page = pdf.addPage([PAGE_W, PAGE_H]);

    // Running header: the document title + a rule.
    page.drawText(doc.title, { x: MARGIN, y: PAGE_H - 44, size: 9, font, color: MUTED });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_H - 52 },
      end: { x: PAGE_W - MARGIN, y: PAGE_H - 52 },
      thickness: 0.75,
      color: RULE,
    });

    let y = PAGE_H - 84;

    // Section heading.
    for (const line of wrap(spec.heading, bold, 15, CONTENT_W)) {
      page.drawText(line, { x: MARGIN, y, size: 15, font: bold, color: INK });
      y -= 21;
    }
    y -= 8;

    // Body paragraphs.
    for (const para of spec.body) {
      for (const line of wrap(para, font, 11, CONTENT_W)) {
        if (y < 70) break; // keep content on the page; specs are sized to fit
        page.drawText(line, { x: MARGIN, y, size: 11, font, color: INK, lineHeight: 16 });
        y -= 16;
      }
      y -= 8;
    }

    // Footer: page number (what citations point at).
    page.drawText(`Page ${index + 1}`, {
      x: PAGE_W / 2 - 18,
      y: 32,
      size: 9,
      font,
      color: MUTED,
    });
  });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
