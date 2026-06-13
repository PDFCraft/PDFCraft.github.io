import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import type { EditorTool, TextBlock } from '../types/editor'
import { extractPageText } from '../lib/extractPageText'
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
  selectedId: string | null
  onSelect: (id: string | null) => void
  onUpdateBlock: (id: string, patch: Partial<TextBlock>) => void
  onDeleteBlock: (id: string) => void
  onAddText: (pageIndex: number, x: number, y: number) => void
  onPageBlocksExtracted: (pageIndex: number, blocks: TextBlock[]) => void
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
  selectedId,
  onSelect,
  onUpdateBlock,
  onDeleteBlock,
  onAddText,
  onPageBlocksExtracted,
}: PdfViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState<PDFPageProxy | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const fitApplied = useRef(false)
  const extractedRef = useRef(new Set<number>())

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

        if (!extractedRef.current.has(currentPage)) {
          extractedRef.current.add(currentPage)
          const pdfBlocks = await extractPageText(loaded, currentPage)
          if (!cancelled) onPageBlocksExtracted(currentPage, pdfBlocks)
        }

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
  }, [pdf, currentPage, onPageBlocksExtracted, onScaleChange])

  useEffect(() => {
    fitApplied.current = false
    extractedRef.current = new Set()
  }, [pdf])

  const cursorClass = tool === 'text' ? 'pdf-viewer--text' : ''

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
            selectedId={selectedId}
            onSelect={onSelect}
            onUpdateBlock={onUpdateBlock}
            onDeleteBlock={onDeleteBlock}
            onAddText={onAddText}
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
