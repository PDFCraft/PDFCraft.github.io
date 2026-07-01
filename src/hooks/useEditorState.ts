import { useCallback, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type {
  EditorTool,
  InkStroke,
  InkStyle,
  SavedEditorState,
  StrokePoint,
  TextBlock,
  TextStyle,
} from '../types/editor'
import { DEFAULT_INK_STYLE } from '../types/editor'

const DEFAULT_STYLE: TextStyle = {
  fontSize: 14,
  color: '#111827',
  fontFamily: 'Helvetica, Arial, sans-serif',
  bold: false,
  italic: false,
}

export function useEditorState(initial?: SavedEditorState) {
  const [tool, setToolState] = useState<EditorTool>(initial?.tool ?? 'select')
  const [blocks, setBlocks] = useState<TextBlock[]>(initial?.blocks ?? [])
  const [strokes, setStrokes] = useState<InkStroke[]>(initial?.strokes ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [textStyle, setTextStyle] = useState<TextStyle>(initial?.textStyle ?? DEFAULT_STYLE)
  const [inkStyle, setInkStyle] = useState<InkStyle>(initial?.inkStyle ?? DEFAULT_INK_STYLE)
  const [zoom, setZoom] = useState(initial?.zoom ?? 1)
  const [currentPage, setCurrentPage] = useState(initial?.currentPage ?? 0)
  const [extractedPages, setExtractedPages] = useState<number[]>(() => {
    if (initial?.extractedPages?.length) return initial.extractedPages
    if (initial?.blocks?.length) {
      return [...new Set(initial.blocks.map((b) => b.pageIndex))]
    }
    return []
  })

  const selectedBlock = blocks.find((b) => b.id === selectedId && !b.deleted) ?? null

  const setTool = useCallback((next: EditorTool) => {
    setToolState(next)
    if (next === 'pen' || next === 'highlighter') setSelectedId(null)
  }, [])

  const addPageBlocks = useCallback((pageIndex: number, pdfBlocks: TextBlock[]) => {
    setExtractedPages((prev) => (prev.includes(pageIndex) ? prev : [...prev, pageIndex]))
    setBlocks((prev) => {
      const userBlocks = prev.filter((b) => b.pageIndex === pageIndex && b.source === 'user')
      const other = prev.filter((b) => b.pageIndex !== pageIndex)
      return [...other, ...pdfBlocks, ...userBlocks]
    })
  }, [])

  const addTextField = useCallback(
    (pageIndex: number, x: number, y: number) => {
      const block: TextBlock = {
        id: uuidv4(),
        pageIndex,
        x,
        y,
        text: 'Type here',
        fontSize: textStyle.fontSize,
        color: textStyle.color,
        fontFamily: textStyle.fontFamily,
        width: 180,
        height: textStyle.fontSize * 1.4,
        bold: textStyle.bold,
        italic: textStyle.italic,
        deleted: false,
        modified: true,
        source: 'user',
      }
      setBlocks((prev) => [...prev, block])
      setSelectedId(block.id)
      setTool('select')
    },
    [setTool, textStyle],
  )

  const updateBlock = useCallback((id: string, patch: Partial<TextBlock>) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              ...patch,
              modified: b.source === 'user' ? true : patch.modified ?? true,
            }
          : b,
      ),
    )
  }, [])

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, deleted: true } : b)),
    )
    setSelectedId((cur) => (cur === id ? null : cur))
  }, [])

  const applyStyleToSelected = useCallback(
    (style: Partial<TextStyle>) => {
      setTextStyle((prev) => ({ ...prev, ...style }))
      if (selectedId) {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === selectedId ? { ...b, ...style, modified: true } : b,
          ),
        )
      }
    },
    [selectedId],
  )

  const applyInkStyle = useCallback((style: Partial<InkStyle>) => {
    setInkStyle((prev) => ({ ...prev, ...style }))
  }, [])

  const startStroke = useCallback(
    (pageIndex: number, point: StrokePoint, strokeTool: 'pen' | 'highlighter') => {
      const id = uuidv4()
      const isPen = strokeTool === 'pen'
      const stroke: InkStroke = {
        id,
        pageIndex,
        points: [point],
        color: isPen ? inkStyle.penColor : inkStyle.highlighterColor,
        width: isPen ? inkStyle.penWidth : inkStyle.highlighterWidth,
        opacity: isPen ? 1 : 0.4,
        tool: strokeTool,
      }
      setStrokes((prev) => [...prev, stroke])
      return id
    },
    [inkStyle],
  )

  const appendStrokePoint = useCallback((id: string, point: StrokePoint) => {
    setStrokes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, points: [...s.points, point] } : s)),
    )
  }, [])

  const reset = useCallback(() => {
    setBlocks([])
    setStrokes([])
    setSelectedId(null)
    setToolState('select')
    setZoom(1)
    setCurrentPage(0)
    setTextStyle(DEFAULT_STYLE)
    setInkStyle(DEFAULT_INK_STYLE)
    setExtractedPages([])
  }, [])

  const snapshot = useMemo(
    (): SavedEditorState => ({
      blocks,
      strokes,
      tool,
      textStyle,
      inkStyle,
      zoom,
      currentPage,
      extractedPages,
    }),
    [blocks, strokes, tool, textStyle, inkStyle, zoom, currentPage, extractedPages],
  )

  const hasChanges = useMemo(() => {
    const hasBlockEdits = blocks.some((b) => b.source === 'user' || b.modified || b.deleted)
    const hasInk = strokes.some((s) => s.points.length >= 2)
    return hasBlockEdits || hasInk
  }, [blocks, strokes])

  return {
    tool,
    setTool,
    blocks,
    strokes,
    selectedId,
    setSelectedId,
    selectedBlock,
    textStyle,
    inkStyle,
    addPageBlocks,
    addTextField,
    updateBlock,
    deleteBlock,
    applyStyleToSelected,
    applyInkStyle,
    startStroke,
    appendStrokePoint,
    zoom,
    setZoom,
    currentPage,
    setCurrentPage,
    extractedPages,
    reset,
    snapshot,
    hasChanges,
  }
}
