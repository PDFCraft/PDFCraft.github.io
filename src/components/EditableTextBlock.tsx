import { useCallback, useEffect, useRef, useState } from 'react'
import type { EditorTool, TextBlock } from '../types/editor'
import './EditableTextBlock.css'

interface EditableTextBlockProps {
  block: TextBlock
  scale: number
  selected: boolean
  tool: EditorTool
  onSelect: () => void
  onUpdate: (patch: Partial<TextBlock>) => void
  onDelete: () => void
}

const DRAG_THRESHOLD = 4
const MIN_WIDTH = 48
const MIN_HEIGHT = 24

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'e' | 's'

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

export function EditableTextBlock({
  block,
  scale,
  selected,
  tool,
  onSelect,
  onUpdate,
  onDelete,
}: EditableTextBlockProps) {
  const [editing, setEditing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const blockRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const resizingRef = useRef(false)

  const showOverlayText = block.source === 'user' || block.modified
  const canResize = block.source === 'user'
  const showHandles = canResize && selected && tool === 'select'

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (selected && block.source === 'user' && block.text === 'Type here') {
      setEditing(true)
    }
  }, [selected, block.source, block.text])

  useEffect(() => {
    resizingRef.current = resizing
  }, [resizing])

  useEffect(() => {
    if (!canResize || !selected || editing) return
    const el = blockRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      if (resizingRef.current) return
      const nextWidth = el.offsetWidth / scale
      const nextHeight = el.offsetHeight / scale
      if (
        Math.abs(nextWidth - block.width) > 0.5 ||
        Math.abs(nextHeight - block.height) > 0.5
      ) {
        onUpdate({ width: nextWidth, height: nextHeight, modified: true })
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [block.height, block.width, canResize, editing, onUpdate, scale, selected])

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, handle: ResizeHandle) => {
      e.stopPropagation()
      e.preventDefault()
      if (!canResize || tool !== 'select') return

      onSelect()
      setEditing(false)
      textareaRef.current?.blur()
      setResizing(true)

      const start = {
        x: block.x,
        y: block.y,
        width: block.width,
        height: block.height,
      }
      const originX = e.clientX
      const originY = e.clientY
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)

      const onMove = (ev: PointerEvent) => {
        const dx = (ev.clientX - originX) / scale
        const dy = (ev.clientY - originY) / scale
        onUpdate({ ...applyResize(handle, start, dx, dy), modified: true })
      }

      const onUp = (ev: PointerEvent) => {
        setResizing(false)
        target.releasePointerCapture(ev.pointerId)
        target.removeEventListener('pointermove', onMove)
        target.removeEventListener('pointerup', onUp)
        target.removeEventListener('pointercancel', onUp)
      }

      target.addEventListener('pointermove', onMove)
      target.addEventListener('pointerup', onUp)
      target.addEventListener('pointercancel', onUp)
    },
    [block, canResize, onSelect, onUpdate, scale, tool],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (tool === 'text' || tool === 'pen' || tool === 'highlighter' || resizing) return
      if ((e.target as HTMLElement).closest('.text-block__handle')) return

      e.stopPropagation()
      onSelect()

      if (tool !== 'select' || editing) return

      const startX = e.clientX
      const startY = e.clientY
      const startBlockX = block.x
      const startBlockY = block.y
      let hasDragged = false

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        if (!hasDragged && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
          return
        }
        hasDragged = true
        setDragging(true)
        onUpdate({
          x: startBlockX + dx / scale,
          y: startBlockY + dy / scale,
          modified: true,
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
    [block.x, block.y, editing, onSelect, onUpdate, resizing, scale, tool],
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (tool === 'text') return
      onSelect()
      setEditing(true)
    },
    [onSelect, tool],
  )

  const finishEditing = useCallback(() => {
    if (textareaRef.current && canResize) {
      onUpdate({
        width: Math.max(MIN_WIDTH, textareaRef.current.offsetWidth / scale),
        height: Math.max(MIN_HEIGHT, textareaRef.current.offsetHeight / scale),
        modified: true,
      })
    }
    setEditing(false)
    if (!block.text.trim()) onDelete()
  }, [block.text, canResize, onDelete, onUpdate, scale])

  if (block.deleted) return null

  const fontSize = block.fontSize * scale

  return (
    <div
      ref={blockRef}
      className={`text-block ${selected ? 'text-block--selected' : ''} ${editing ? 'text-block--editing' : ''} ${dragging ? 'text-block--dragging' : ''} ${resizing ? 'text-block--resizing' : ''} ${block.source === 'pdf' ? 'text-block--pdf' : 'text-block--user'}`}
      style={{
        left: block.x * scale,
        top: block.y * scale,
        width: block.width * scale,
        height: block.height * scale,
        fontSize,
        color: showOverlayText ? block.color : 'transparent',
        fontFamily: block.fontFamily,
        fontWeight: block.bold ? 700 : 400,
        fontStyle: block.italic ? 'italic' : 'normal',
        cursor:
          tool === 'text' || tool === 'pen' || tool === 'highlighter'
            ? 'crosshair'
            : dragging
              ? 'grabbing'
              : tool === 'select' && !editing
                ? 'grab'
                : 'text',
        pointerEvents: tool === 'pen' || tool === 'highlighter' ? 'none' : undefined,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={handleDoubleClick}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          className="text-block__input"
          value={block.text}
          onChange={(e) => onUpdate({ text: e.target.value, modified: true })}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              finishEditing()
            }
            if (e.key === 'Delete' || e.key === 'Backspace') e.stopPropagation()
          }}
          style={{
            width: '100%',
            height: '100%',
            fontSize,
            color: block.color,
            fontFamily: block.fontFamily,
            fontWeight: block.bold ? 700 : 400,
            fontStyle: block.italic ? 'italic' : 'normal',
          }}
        />
      ) : (
        showOverlayText && <span className="text-block__label">{block.text}</span>
      )}

      {showHandles && (
        <div className="text-block__handles">
          {(['nw', 'ne', 'sw', 'se', 'e', 's'] as ResizeHandle[]).map((handle) => (
            <span
              key={handle}
              className={`text-block__handle text-block__handle--${handle}`}
              onPointerDown={(e) => handleResizePointerDown(e, handle)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
