import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import type { EditorTool, InkStroke, InkStyle, SignaturePlacement, TextBlock } from '../types/editor'
import { PdfPage } from './PdfPage'
import './PdfViewer.css'

interface PdfViewerProps {
  pdf: PDFDocumentProxy
  pageCount: number
  scale: number
  currentPage: number
  onScaleChange: (scale: number) => void
  tool: EditorTool
  blocks: TextBlock[]
  strokes: InkStroke[]
  signatures: SignaturePlacement[]
  inkStyle: InkStyle
  selectedId: string | null
  selectedSignatureId: string | null
  onSelect: (id: string | null) => void
  onSelectSignature: (id: string | null) => void
  onUpdateBlock: (id: string, patch: Partial<TextBlock>) => void
  onDeleteBlock: (id: string) => void
  onUpdateSignature: (id: string, patch: Partial<SignaturePlacement>) => void
  onDeleteSignature: (id: string) => void
  onAddText: (pageIndex: number, x: number, y: number) => void
  onPlaceSignature: (pageIndex: number, x: number, y: number) => void
  onStrokeStart: (pageIndex: number, point: { x: number; y: number }, tool: 'pen' | 'highlighter') => string
  onStrokeAppend: (id: string, point: { x: number; y: number }) => void
}

function computeFitScale(containerWidth: number, pageWidth: number) {
  const padding = 48
  const available = Math.max(containerWidth - padding, 200)
  return Math.min(2.5, Math.max(0.25, available / pageWidth))
}

export function PdfViewer({
  pdf,
  pageCount,
  scale,
  currentPage,
  onScaleChange,
  tool,
  blocks,
  strokes,
  signatures,
  inkStyle,
  selectedId,
  selectedSignatureId,
  onSelect,
  onSelectSignature,
  onUpdateBlock,
  onDeleteBlock,
  onUpdateSignature,
  onDeleteSignature,
  onAddText,
  onPlaceSignature,
  onStrokeStart,
  onStrokeAppend,
}: PdfViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState<PDFPageProxy | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const fitApplied = useRef(false)

  useEffect(() => {
    let cancelled = false
    setPageLoading(true)
    setPageError(null)

    const loadPage = async () => {
      try {
        const loaded = await pdf.getPage(currentPage + 1)
        if (cancelled) return

        setPage(loaded)
        setPageLoading(false)

        if (!fitApplied.current && viewerRef.current) {
          const baseViewport = loaded.getViewport({ scale: 1 })
          const fit = computeFitScale(viewerRef.current.clientWidth, baseViewport.width)
          fitApplied.current = true
          onScaleChange(fit)
        }
      } catch (err) {
        if (!cancelled) {
          setPageError(err instanceof Error ? err.message : 'Failed to load page')
          setPageLoading(false)
        }
      }
    }

    void loadPage()

    return () => {
      cancelled = true
    }
  }, [pdf, currentPage, onScaleChange])

  useEffect(() => {
    fitApplied.current = false
  }, [pdf])

  const cursorClass =
    tool === 'text' || tool === 'pen' || tool === 'highlighter' || tool === 'signature'
      ? 'pdf-viewer--draw'
      : ''

  return (
    <div ref={viewerRef} className={`pdf-viewer ${cursorClass}`}>
      <div className="pdf-viewer__content">
        {pageLoading && (
          <div className="pdf-page pdf-page--placeholder">Loading page {currentPage + 1}…</div>
        )}

        {pageError && (
          <div className="pdf-page pdf-page--placeholder pdf-page--error">{pageError}</div>
        )}

        {page && !pageLoading && (
          <PdfPage
            key={currentPage}
            page={page}
            pageIndex={currentPage}
            scale={scale}
            blocks={blocks}
            strokes={strokes}
            signatures={signatures}
            inkStyle={inkStyle}
            selectedId={selectedId}
            selectedSignatureId={selectedSignatureId}
            onSelect={onSelect}
            onSelectSignature={onSelectSignature}
            onUpdateBlock={onUpdateBlock}
            onDeleteBlock={onDeleteBlock}
            onUpdateSignature={onUpdateSignature}
            onDeleteSignature={onDeleteSignature}
            onAddText={onAddText}
            onPlaceSignature={onPlaceSignature}
            onStrokeStart={onStrokeStart}
            onStrokeAppend={onStrokeAppend}
            tool={tool}
          />
        )}
      </div>

      {pageCount > 1 && (
        <div className="pdf-viewer__hint">
          Page {currentPage + 1} of {pageCount}
        </div>
      )}
    </div>
  )
}
