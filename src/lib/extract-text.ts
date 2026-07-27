// Client-only text extraction from uploaded files (txt, md, pdf).
import * as pdfjs from "pdfjs-dist";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- worker imported as URL
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configure worker once (browser only)
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc as string;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const out: string[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const strs = content.items.map((it) =>
        "str" in it ? (it as { str: string }).str : "",
      );
      out.push(strs.join(" "));
    }
    return out.join("\n\n");
  }
  // Treat everything else as text
  return await file.text();
}
