import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { GlobalWorkerOptions, getDocument, type PDFDocumentLoadingTask } from 'pdfjs-dist/legacy/build/pdf.mjs'

GlobalWorkerOptions.workerSrc = workerUrl

export function openPdfDocument(data: Uint8Array): PDFDocumentLoadingTask {
  return getDocument({
    data: data.slice(),
    cMapUrl: `${import.meta.env.BASE_URL}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${import.meta.env.BASE_URL}standard_fonts/`,
    useSystemFonts: true,
    isEvalSupported: false,
  })
}
