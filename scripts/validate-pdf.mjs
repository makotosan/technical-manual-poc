import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { pathToFileURL } from "node:url";

export async function validatePdf(path) {
  const bytes = await readFile(path);
  if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("Invalid PDF header");
  const pdf = await PDFDocument.load(bytes);
  if (pdf.getPageCount() < 3) throw new Error("Expected a multi-page, three-chapter PDF");
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    if (Math.abs(width - 595.28) > 1 || Math.abs(height - 841.89) > 1) throw new Error("Expected A4 pages");
  }
  console.log(`Valid PDF: ${pdf.getPageCount()} A4 pages, ${bytes.length} bytes`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await validatePdf(process.argv[2] || "dist-pdf/manual.pdf");
}
