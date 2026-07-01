import { useCallback, useState } from 'react'
import type { EditorTool, SignaturePlacement } from '../types/editor'
import './PlacedSignature.css'

interface PlacedSignatureProps {
  signature: SignaturePlacement
  scale: number
  selected: boolean
  tool: EditorTool
  onSelect: () => void
  onUpdate: (patch: Partial<SignaturePlacement>) => void
  onDelete: () => void
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'e' | 's'

const MIN_WIDTH = 60
const MIN_HEIGHT = 24

function applyResize(
  handle: ResizeHandle,
  start: { x: number; y: number; width: number; height: number },
  dx: number,
  dy: number,
) {
  let { x, y, width, height } = start

  switch (handle) {
    case 'se':
      width = Math.max(MIN_WIDTH, start.width + dx)
      height = Math.max(MIN_HEIGHT, start.height + dy)
      break
    case 'sw':
      width = Math.max(MIN_WIDTH, start.width - dx)
      height = Math.max(MIN_HEIGHT, start.height + dy)
      x = start.x + (start.width - width)
      break
    case 'ne':
      width = Math.max(MIN_WIDTH, start.width + dx)
      height = Math.max(MIN_HEIGHT, start.height - dy)
      y = start.y + (start.height - height)
      break
    case 'nw':
      width = Math.max(MIN_WIDTH, start.width - dx)
      height = Math.max(MIN_HEIGHT, start.height - dy)
      x = start.x + (start.width - width)
      y = start.y + (start.height - height)
      break
    case 'e':
      width = Math.max(MIN_WIDTH, start.width + dx)
      break
    case 's':
      height = Math.max(MIN_HEIGHT, start.height + dy)
      break
  }

  return { x, y, width, height }
}

export function PlacedSignature({
  signature,
  scale,
  selected,
  tool,
  onSelect,
  onUpdate,
  onDelete,
}: PlacedSignatureProps) {
  const [dragging, setDragging] = useState(false)

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, handle: ResizeHandle) => {
      e.stopPropagation()
      e.preventDefault()
      if (tool !== 'select') return
      onSelect()

      const start = { x: signature.x, y: signature.y, width: signature.width, height: signature.height }
      const originX = e.clientX
      const originY = e.clientY
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)

      const onMove = (ev: PointerEvent) => {
        const dx = (ev.clientX - originX) / scale
        const dy = (ev.clientY - originY) / scale
        onUpdate(applyResize(handle, start, dx, dy))
      }

      const onUp = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId)
        target.removeEventListener('pointermove', onMove)
        target.removeEventListener('pointerup', onUp)
      }

      target.addEventListener('pointermove', onMove)
      target.addEventListener('pointerup', onUp)
    },
    [onSelect, onUpdate, scale, signature, tool],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (tool !== 'select') return
      if ((e.target as HTMLElement).closest('.placed-signature__handle')) return
      e.stopPropagation()
      onSelect()

      const startX = e.clientX
      const startY = e.clientY
      const startSigX = signature.x
      const startSigY = signature.y

      const onMove = (ev: MouseEvent) => {
        setDragging(true)
        onUpdate({
          x: startSigX + (ev.clientX - startX) / scale,
          y: startSigY + (ev.clientY - startY) / scale,
        })
      }

      const onUp = () => {
        setDragging(false)
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [onSelect, onUpdate, scale, signature.x, signature.y, tool],
  )

  return (
    <div
      className={`placed-signature ${selected ? 'placed-signature--selected' : ''} ${dragging ? 'placed-signature--dragging' : ''}`}
      style={{
        left: signature.x * scale,
        top: signature.y * scale,
        width: signature.width * scale,
        height: signature.height * scale,
        pointerEvents: tool === 'pen' || tool === 'highlighter' || tool === 'signature' ? 'none' : undefined,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      <img src={signature.imageDataUrl} alt="Signature" draggable={false} />

      {selected && tool === 'select' && (
        <>
          <div className="placed-signature__handles">
            {(['nw', 'ne', 'sw', 'se', 'e', 's'] as ResizeHandle[]).map((handle) => (
              <span
                key={handle}
                className={`placed-signature__handle placed-signature__handle--${handle}`}
                onPointerDown={(e) => handleResizePointerDown(e, handle)}
              />
            ))}
          </div>
          <button
            type="button"
            className="placed-signature__delete"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title="Remove signature"
          >
            ×
          </button>
        </>
      )}
    </div>
  )
}
