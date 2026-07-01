import { useLayoutEffect, useRef, useState } from 'react'
import type { PDFPageProxy } from 'pdfjs-dist'
import type { RenderTask } from 'pdfjs-dist'
import type { EditorTool, InkStroke, InkStyle, SignaturePlacement, TextBlock } from '../types/editor'
import { EditableTextBlock } from './EditableTextBlock'
import { InkLayer } from './InkLayer'
import { PlacedSignature } from './PlacedSignature'
import './PdfPage.css'

interface PdfPageProps {
  page: PDFPageProxy
  pageIndex: number
  scale: number
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
  onAddText: (pageIndex: number, pdfX: number, pdfY: number) => void
  onPlaceSignature: (pageIndex: number, pdfX: number, pdfY: number) => void
  onStrokeStart: (pageIndex: number, point: { x: number; y: number }, tool: 'pen' | 'highlighter') => string
  onStrokeAppend: (id: string, point: { x: number; y: number }) => void
  tool: EditorTool
}

export function PdfPage({
  page,
  pageIndex,
  scale,
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
  tool,
}: PdfPageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const renderIdRef = useRef(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })

  const isDrawingTool = tool === 'pen' || tool === 'highlighter'

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
    if (isDrawingTool || tool === 'signature') return
    if ((e.target as HTMLElement).closest('.text-block, .placed-signature')) return
    if (tool === 'select') {
      onSelect(null)
      onSelectSignature(null)
    }
  }

  const handlePageClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.text-block, .placed-signature')) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const pdfX = (e.clientX - rect.left) / scale
    const pdfY = (e.clientY - rect.top) / scale

    if (tool === 'text') {
      onAddText(pageIndex, pdfX, pdfY)
      return
    }

    if (tool === 'signature') {
      onPlaceSignature(pageIndex, pdfX, pdfY)
    }
  }

  const pageBlocks = blocks.filter((b) => b.pageIndex === pageIndex && !b.deleted)
  const pageSignatures = signatures.filter((s) => s.pageIndex === pageIndex)

  return (
    <div
      className={`pdf-page ${tool === 'signature' ? 'pdf-page--place-signature' : ''}`}
      ref={containerRef}
      style={{ width: displaySize.width || undefined, height: displaySize.height || undefined }}
      onMouseDown={handlePageMouseDown}
      onClick={handlePageClick}
    >
      <canvas ref={canvasRef} className="pdf-page__canvas" />
      <div className="pdf-page__overlay">
        <InkLayer
          pageIndex={pageIndex}
          scale={scale}
          strokes={strokes}
          tool={tool}
          inkStyle={inkStyle}
          onStrokeStart={onStrokeStart}
          onStrokeAppend={onStrokeAppend}
          containerRef={containerRef}
        />
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
        {pageSignatures.map((sig) => (
          <PlacedSignature
            key={sig.id}
            signature={sig}
            scale={scale}
            selected={selectedSignatureId === sig.id}
            tool={tool}
            onSelect={() => onSelectSignature(sig.id)}
            onUpdate={(patch) => onUpdateSignature(sig.id, patch)}
            onDelete={() => onDeleteSignature(sig.id)}
          />
        ))}
      </div>
      {tool === 'signature' && (
        <div className="pdf-page__place-hint">Click where you want to place your signature</div>
      )}
      {status === 'loading' && <div className="pdf-page__loading">Rendering page…</div>}
      {status === 'error' && (
        <div className="pdf-page__loading pdf-page__loading--error">{error}</div>
      )}
    </div>
  )
}
