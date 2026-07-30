// Client-only text extraction from uploaded files (pdf, docx, txt/md, images).
import * as pdfjs from "pdfjs-dist";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- worker imported as URL
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configure worker once (browser only)
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc as string;
}

export type ExtractionMethod = "text" | "ocr" | "docx" | "plain";

export type ExtractedDoc = {
  /** One entry per page (docx/plain produce synthetic pages). */
  pages: string[];
  pageCount: number;
  method: ExtractionMethod;
  charCount: number;
};

export type StageReporter = (message: string) => void;

const OCR_MIN_CHARS_PER_PAGE = 40;

function paginatePlainText(text: string, perPage = 2500): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  const pages: string[] = [];
  for (let i = 0; i < clean.length; i += perPage) pages.push(clean.slice(i, i + perPage));
  return pages;
}

async function ocrImageLike(
  images: (Blob | HTMLCanvasElement)[],
  report: StageReporter,
): Promise<string[]> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  const out: string[] = [];
  try {
    for (let i = 0; i < images.length; i++) {
      report(`OCR page ${i + 1} of ${images.length}…`);
      const src = images[i];
      const { data } = await worker.recognize(src as never);
      out.push(data.text ?? "");
    }
  } finally {
    await worker.terminate();
  }
  return out;
}

async function renderPdfPagesToCanvas(
  pdf: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>,
): Promise<HTMLCanvasElement[]> {
  const canvases: HTMLCanvasElement[] = [];
  const max = Math.min(pdf.numPages, 20); // keep OCR bounded in the browser
  for (let p = 1; p <= max; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (page as any).render({ canvasContext: ctx, viewport, canvas }).promise;
    canvases.push(canvas);
  }
  return canvases;
}

export async function extractDocument(
  file: File,
  report: StageReporter = () => {},
): Promise<ExtractedDoc> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    report("Extracting text from PDF…");
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const pages: string[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      pages.push(
        content.items.map((it) => ("str" in it ? (it as { str: string }).str : "")).join(" "),
      );
    }
    const total = pages.join("").replace(/\s/g, "").length;
    if (total >= OCR_MIN_CHARS_PER_PAGE * pdf.numPages) {
      const charCount = pages.join("\n").length;
      return { pages, pageCount: pdf.numPages, method: "text", charCount };
    }
    // Scanned PDF → OCR
    report("No embedded text found — running OCR…");
    const canvases = await renderPdfPagesToCanvas(pdf);
    const ocrPages = await ocrImageLike(canvases, report);
    return {
      pages: ocrPages,
      pageCount: pdf.numPages,
      method: "ocr",
      charCount: ocrPages.join("\n").length,
    };
  }

  if (name.endsWith(".docx")) {
    report("Extracting text from Word document…");
    const mammoth = await import("mammoth/mammoth.browser");
    const buf = await file.arrayBuffer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (mammoth as any).extractRawText({ arrayBuffer: buf });
    const pages = paginatePlainText(String(res.value ?? ""));
    return {
      pages,
      pageCount: pages.length,
      method: "docx",
      charCount: pages.join("\n").length,
    };
  }

  if (/\.(png|jpe?g|webp|bmp|tiff?)$/.test(name)) {
    report("Scanned image detected — running OCR…");
    const ocrPages = await ocrImageLike([file], report);
    return {
      pages: ocrPages,
      pageCount: 1,
      method: "ocr",
      charCount: ocrPages.join("\n").length,
    };
  }

  report("Reading text file…");
  const text = await file.text();
  const pages = paginatePlainText(text);
  return { pages, pageCount: pages.length, method: "plain", charCount: text.length };
}

/** Backwards-compatible helper. */
export async function extractTextFromFile(file: File): Promise<string> {
  const doc = await extractDocument(file);
  return doc.pages.join("\n\n");
}
