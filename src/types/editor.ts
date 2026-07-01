export type EditorTool = 'select' | 'text' | 'pen' | 'highlighter' | 'signature'

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

export interface StrokePoint {
  x: number
  y: number
}

export interface InkStroke {
  id: string
  pageIndex: number
  points: StrokePoint[]
  color: string
  width: number
  opacity: number
  tool: 'pen' | 'highlighter'
}

export interface InkStyle {
  penColor: string
  penWidth: number
  highlighterColor: string
  highlighterWidth: number
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

export interface SavedEditorState {
  blocks: TextBlock[]
  strokes: InkStroke[]
  signatures: SignaturePlacement[]
  tool: EditorTool
  textStyle: TextStyle
  inkStyle: InkStyle
  zoom: number
  currentPage: number
  /** @deprecated Legacy sessions may include this; no longer used. */
  extractedPages?: number[]
}

export interface SignaturePlacement {
  id: string
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  imageDataUrl: string
}

export interface SavedSession {
  version: 1
  fileName: string
  savedAt: number
  editor: SavedEditorState
}

export const FONT_OPTIONS = [
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Times', value: 'Times New Roman, Times, serif' },
  { label: 'Courier', value: 'Courier New, Courier, monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
] as const

export const DEFAULT_INK_STYLE: InkStyle = {
  penColor: '#111827',
  penWidth: 2,
  highlighterColor: '#facc15',
  highlighterWidth: 14,
}

export const INK_COLORS = [
  '#111827',
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#9333ea',
  '#facc15',
  '#ea580c',
  '#ffffff',
]

export const PEN_WIDTHS = [1, 2, 3, 5, 8]
export const HIGHLIGHTER_WIDTHS = [8, 12, 16, 24]
