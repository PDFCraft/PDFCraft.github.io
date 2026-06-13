import { useCallback, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { EditorTool, TextBlock, TextStyle } from '../types/editor'

const DEFAULT_STYLE: TextStyle = {
  fontSize: 14,
  color: '#111827',
  fontFamily: 'Helvetica, Arial, sans-serif',
  bold: false,
  italic: false,
}

export function useEditorState() {
  const [tool, setTool] = useState<EditorTool>('select')
  const [blocks, setBlocks] = useState<TextBlock[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [textStyle, setTextStyle] = useState<TextStyle>(DEFAULT_STYLE)
  const [zoom, setZoom] = useState(1)
  const [currentPage, setCurrentPage] = useState(0)

  const selectedBlock = blocks.find((b) => b.id === selectedId && !b.deleted) ?? null

  const addPageBlocks = useCallback((pageIndex: number, pdfBlocks: TextBlock[]) => {
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
    [textStyle],
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

  const reset = useCallback(() => {
    setBlocks([])
    setSelectedId(null)
    setTool('select')
    setZoom(1)
    setCurrentPage(0)
    setTextStyle(DEFAULT_STYLE)
  }, [])

  return {
    tool,
    setTool,
    blocks,
    selectedId,
    setSelectedId,
    selectedBlock,
    textStyle,
    addPageBlocks,
    addTextField,
    updateBlock,
    deleteBlock,
    applyStyleToSelected,
    zoom,
    setZoom,
    currentPage,
    setCurrentPage,
    reset,
  }
}
