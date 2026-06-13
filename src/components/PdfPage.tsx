import { useLayoutEffect, useRef, useState } from 'react'
import type { PDFPageProxy } from 'pdfjs-dist'
import type { RenderTask } from 'pdfjs-dist'
import type { EditorTool, TextBlock } from '../types/editor'
import { EditableTextBlock } from './EditableTextBlock'
import './PdfPage.css'

interface PdfPageProps {
  page: PDFPageProxy
  pageIndex: number
  scale: number
  blocks: TextBlock[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onUpdateBlock: (id: string, patch: Partial<TextBlock>) => void
  onDeleteBlock: (id: string) => void
  onAddText: (pageIndex: number, pdfX: number, pdfY: number) => void
  tool: EditorTool
}

export function PdfPage({
  page,
  pageIndex,
  scale,
  blocks,
  selectedId,
  onSelect,
  onUpdateBlock,
  onDeleteBlock,
  onAddText,
  tool,
}: PdfPageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const renderIdRef = useRef(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderId = ++renderIdRef.current
    let cancelled = false

    setStatus('loading')
    setError(null)
    renderTaskRef.current?.cancel()

    const render = async () => {
      try {
        const pixelRatio = Math.max(window.devicePixelRatio || 1, 1)
        const renderScale = scale * pixelRatio
        const viewport = page.getViewport({ scale: renderScale })

        canvas.width = viewport.width
        canvas.height = viewport.height

        const cssWidth = Math.floor(viewport.width / pixelRatio)
        const cssHeight = Math.floor(viewport.height / pixelRatio)
        canvas.style.width = `${cssWidth}px`
        canvas.style.height = `${cssHeight}px`
        setDisplaySize({ width: cssWidth, height: cssHeight })

        const context = canvas.getContext('2d', { alpha: false })
        if (!context) throw new Error('Canvas is not supported')

        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)

        const task = page.render({ canvasContext: context, viewport, canvas, intent: 'display' })
        renderTaskRef.current = task
        await task.promise

        if (!cancelled && renderId === renderIdRef.current) setStatus('ready')
      } catch (err) {
        if (cancelled || renderId !== renderIdRef.current) return
        if (err instanceof Error && err.name === 'RenderingCancelledException') return
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to render page')
      }
    }

    void render()

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
      renderTaskRef.current = null
    }
  }, [page, scale])

  const handlePageMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.text-block')) return
    if (tool === 'select') onSelect(null)
  }

  const handlePageClick = (e: React.MouseEvent) => {
    if (tool !== 'text') return
    if ((e.target as HTMLElement).closest('.text-block')) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    onAddText(pageIndex, (e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale)
  }

  const pageBlocks = blocks.filter((b) => b.pageIndex === pageIndex && !b.deleted)

  return (
    <div
      className="pdf-page"
      ref={containerRef}
      style={{ width: displaySize.width || undefined, height: displaySize.height || undefined }}
      onMouseDown={handlePageMouseDown}
      onClick={handlePageClick}
    >
      <canvas ref={canvasRef} className="pdf-page__canvas" />
      <div className="pdf-page__overlay">
        {pageBlocks.map((block) => (
          <EditableTextBlock
            key={block.id}
            block={block}
            scale={scale}
            selected={selectedId === block.id}
            tool={tool}
            onSelect={() => onSelect(block.id)}
            onUpdate={(patch) => onUpdateBlock(block.id, patch)}
            onDelete={() => onDeleteBlock(block.id)}
          />
        ))}
      </div>
      {status === 'loading' && <div className="pdf-page__loading">Rendering page…</div>}
      {status === 'error' && (
        <div className="pdf-page__loading pdf-page__loading--error">{error}</div>
      )}
    </div>
  )
}
