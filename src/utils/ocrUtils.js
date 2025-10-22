// src/utils/ocrUtils.js
import Tesseract from 'tesseract.js';

/**
 * Extract text from an image or PDF (handwritten notes)
 * @param {File} file
 * @returns {Promise<string>} extracted text
 */
export async function extractTextFromHandwritten(file) {
  // For image files: direct OCR
  if (file.type.startsWith('image/')) {
    const { data: { text } } = await Tesseract.recognize(file, 'eng', {
      logger: info => console.log(info),
    });
    return text;
  }

  // For PDFs, optional: convert each page to image before OCR
  if (file.type === 'application/pdf') {
    const pdfjsLib = await import('pdfjs-dist');
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;

      const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
      fullText += `\n\n--- Page ${i} ---\n\n${text}`;
    }

    return fullText;
  }

  throw new Error('Unsupported file type for OCR');
}
