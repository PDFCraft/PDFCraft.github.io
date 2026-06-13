import type { PdfDocumentState } from '../types/editor'

export async function loadPdfFromFile(file: File): Promise<PdfDocumentState> {
  const buffer = await file.arrayBuffer()

  return {
    fileName: file.name.replace(/\.pdf$/i, '') || 'document',
    pdfBytes: new Uint8Array(buffer),
    pageCount: 0,
    pageDimensions: [],
  }
}
