export type EditorTool = 'select' | 'text'

export interface TextBlock {
  id: string
  pageIndex: number
  text: string
  /** PDF points from left */
  x: number
  /** PDF points from top */
  y: number
  width: number
  height: number
  fontSize: number
  color: string
  fontFamily: string
  bold: boolean
  italic: boolean
  deleted: boolean
  modified: boolean
  source: 'pdf' | 'user'
  /** Original bounds for white-out on export */
  originalBounds?: { x: number; y: number; width: number; height: number }
}

export interface PageDimensions {
  width: number
  height: number
}

export interface PdfDocumentState {
  fileName: string
  pdfBytes: Uint8Array
  pageCount: number
  pageDimensions: PageDimensions[]
}

export interface TextStyle {
  fontSize: number
  color: string
  fontFamily: string
  bold: boolean
  italic: boolean
}

export const FONT_OPTIONS = [
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Times', value: 'Times New Roman, Times, serif' },
  { label: 'Courier', value: 'Courier New, Courier, monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
] as const
