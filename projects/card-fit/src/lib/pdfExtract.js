import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extract plain text from a PDF in the browser (no upload to a server).
 * Uses PDF.js line breaks when available; falls back to spaced join per page.
 * @param {ArrayBuffer} data
 * @returns {Promise<string>}
 */
export async function extractPdfText(data) {
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const chunks = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const lines = [];
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
        .map((it) => it.str)
        .join(" ");
      chunks.push(fallback);
    }
  }

  return chunks.join("\n\n");
}
