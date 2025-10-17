import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// extract text per page
export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const textItems = textContent.items.map(i=>i.str);
    pages.push({ pageNumber: i, text: textItems.join(' ') });
  }
  return pages; // array of {pageNumber, text}
}
