import { useCallback, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_SIGNATURE_SIZE } from '../lib/signatureUtils'
import type {
  EditorTool,
  InkStroke,
  InkStyle,
  SavedEditorState,
  SignaturePlacement,
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
  const [blocks, setBlocks] = useState<TextBlock[]>(() =>
    (initial?.blocks ?? []).filter((b) => b.source === 'user'),
  )
  const [strokes, setStrokes] = useState<InkStroke[]>(initial?.strokes ?? [])
  const [signatures, setSignatures] = useState<SignaturePlacement[]>(initial?.signatures ?? [])
  const [pendingSignatureImage, setPendingSignatureImage] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null)
  const [textStyle, setTextStyle] = useState<TextStyle>(initial?.textStyle ?? DEFAULT_STYLE)
  const [inkStyle, setInkStyle] = useState<InkStyle>(initial?.inkStyle ?? DEFAULT_INK_STYLE)
  const [zoom, setZoom] = useState(initial?.zoom ?? 1)
  const [currentPage, setCurrentPage] = useState(initial?.currentPage ?? 0)

  const selectedBlock = blocks.find((b) => b.id === selectedId && !b.deleted) ?? null
  const selectedSignature =
    signatures.find((s) => s.id === selectedSignatureId) ?? null

  const setTool = useCallback((next: EditorTool) => {
    setToolState(next)
    if (next === 'pen' || next === 'highlighter') {
      setSelectedId(null)
      setSelectedSignatureId(null)
    }
    if (next !== 'signature') {
      setPendingSignatureImage(null)
    }
  }, [])

  const setSelectedIdWrapped = useCallback((id: string | null) => {
    setSelectedId(id)
    if (id) setSelectedSignatureId(null)
  }, [])

  const setSelectedSignatureIdWrapped = useCallback((id: string | null) => {
    setSelectedSignatureId(id)
    if (id) setSelectedId(null)
  }, [])

  const beginSignaturePlacement = useCallback((imageDataUrl: string) => {
    setPendingSignatureImage(imageDataUrl)
    setToolState('signature')
    setSelectedId(null)
    setSelectedSignatureId(null)
  }, [])

  const placeSignature = useCallback(
    (pageIndex: number, x: number, y: number) => {
      if (!pendingSignatureImage) return
      const placement: SignaturePlacement = {
        id: uuidv4(),
        pageIndex,
        x: x - DEFAULT_SIGNATURE_SIZE.width / 2,
        y: y - DEFAULT_SIGNATURE_SIZE.height / 2,
        width: DEFAULT_SIGNATURE_SIZE.width,
        height: DEFAULT_SIGNATURE_SIZE.height,
        imageDataUrl: pendingSignatureImage,
      }
      setSignatures((prev) => [...prev, placement])
      setSelectedSignatureIdWrapped(placement.id)
      setPendingSignatureImage(null)
      setToolState('select')
    },
    [pendingSignatureImage, setSelectedSignatureIdWrapped],
  )

  const updateSignature = useCallback((id: string, patch: Partial<SignaturePlacement>) => {
    setSignatures((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const deleteSignature = useCallback((id: string) => {
    setSignatures((prev) => prev.filter((s) => s.id !== id))
    setSelectedSignatureId((cur) => (cur === id ? null : cur))
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
      setSelectedIdWrapped(block.id)
      setTool('select')
    },
    [setSelectedIdWrapped, setTool, textStyle],
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
    setSignatures([])
    setPendingSignatureImage(null)
    setSelectedId(null)
    setSelectedSignatureId(null)
    setToolState('select')
    setZoom(1)
    setCurrentPage(0)
    setTextStyle(DEFAULT_STYLE)
    setInkStyle(DEFAULT_INK_STYLE)
  }, [])

  const snapshot = useMemo(
    (): SavedEditorState => ({
      blocks,
      strokes,
      signatures,
      tool,
      textStyle,
      inkStyle,
      zoom,
      currentPage,
    }),
    [blocks, strokes, signatures, tool, textStyle, inkStyle, zoom, currentPage],
  )

  const hasChanges = useMemo(() => {
    const hasBlockEdits = blocks.some((b) => b.source === 'user' || b.modified || b.deleted)
    const hasInk = strokes.some((s) => s.points.length >= 2)
    const hasSignatures = signatures.length > 0
    return hasBlockEdits || hasInk || hasSignatures
  }, [blocks, strokes, signatures])

  return {
    tool,
    setTool,
    blocks,
    strokes,
    signatures,
    pendingSignatureImage,
    selectedId,
    setSelectedId: setSelectedIdWrapped,
    selectedSignatureId,
    setSelectedSignatureId: setSelectedSignatureIdWrapped,
    selectedBlock,
    selectedSignature,
    textStyle,
    inkStyle,
    beginSignaturePlacement,
    placeSignature,
    updateSignature,
    deleteSignature,
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
    reset,
    snapshot,
    hasChanges,
  }
}
