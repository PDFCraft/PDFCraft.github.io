import { useCallback, useRef } from 'react'
import type { EditorTool, InkStroke, InkStyle, StrokePoint } from '../types/editor'
import './InkLayer.css'

interface InkLayerProps {
  pageIndex: number
  scale: number
  strokes: InkStroke[]
  tool: EditorTool
  inkStyle: InkStyle
  onStrokeStart: (pageIndex: number, point: StrokePoint, tool: 'pen' | 'highlighter') => string
  onStrokeAppend: (id: string, point: StrokePoint) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

function pointsToPath(points: StrokePoint[], scale: number): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  let d = `M ${first.x * scale} ${first.y * scale}`
  for (const p of rest) {
    d += ` L ${p.x * scale} ${p.y * scale}`
  }
  return d
}

export function InkLayer({
  pageIndex,
  scale,
  strokes,
  tool,
  onStrokeStart,
  onStrokeAppend,
  containerRef,
}: InkLayerProps) {
  const activeStrokeId = useRef<string | null>(null)
  const isDrawing = tool === 'pen' || tool === 'highlighter'

  const clientToPoint = useCallback(
    (clientX: number, clientY: number): StrokePoint | null => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return null
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      }
    },
    [containerRef, scale],
  )

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    e.stopPropagation()
    const point = clientToPoint(e.clientX, e.clientY)
    if (!point) return
    e.currentTarget.setPointerCapture(e.pointerId)
    activeStrokeId.current = onStrokeStart(pageIndex, point, tool)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeStrokeId.current) return
    const point = clientToPoint(e.clientX, e.clientY)
    if (!point) return
    onStrokeAppend(activeStrokeId.current, point)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeStrokeId.current) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      activeStrokeId.current = null
    }
  }

  const pageStrokes = strokes.filter((s) => s.pageIndex === pageIndex && s.points.length >= 1)

  return (
    <svg
      className={`ink-layer ${isDrawing ? 'ink-layer--drawing' : ''}`}
      width="100%"
      height="100%"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {pageStrokes.map((stroke) => (
        <path
          key={stroke.id}
          d={pointsToPath(stroke.points, scale)}
          fill="none"
          stroke={stroke.color}
          strokeWidth={stroke.width * scale}
          strokeOpacity={stroke.opacity}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={stroke.tool === 'highlighter' ? 'ink-layer__stroke--highlighter' : undefined}
        />
      ))}
    </svg>
  )
}
