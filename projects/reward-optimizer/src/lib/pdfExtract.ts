/**
 * Extract plain text from a PDF in the browser (no upload to a server).
 * Same approach as Card Fit — PDF.js with remote worker (Next.js–friendly).
 */

import pdfjsPackage from "pdfjs-dist/package.json";

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const version = pdfjsPackage.version;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const chunks: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const lines: string[] = [];
    let line = "";

    for (const item of textContent.items) {
      if (!("str" in item)) continue;
      line += item.str;
      if ("hasEOL" in item && item.hasEOL) {
        lines.push(line.trim());
        line = "";
      }
    }
    if (line.trim()) lines.push(line.trim());

    if (lines.length > 0) {
      chunks.push(lines.join("\n"));
    } else {
      const fallback = textContent.items
        .filter((it) => "str" in it)
        .map((it) => (it as { str: string }).str)
        .join(" ");
      chunks.push(fallback);
    }
  }

  return chunks.join("\n\n");
}
