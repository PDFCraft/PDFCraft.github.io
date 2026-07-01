import { useCallback, useEffect, useRef, useState } from 'react'
import type { PdfDocumentState, SavedEditorState } from '../types/editor'
import { downloadPdf, exportPdfWithEdits } from '../lib/pdfExporter'
import { buildSavedSession, clearSession, saveSession } from '../lib/sessionStorage'
import { useEditorState } from '../hooks/useEditorState'
import { usePdfDocument } from '../hooks/usePdfDocument'
import { EditSidebar } from './EditSidebar'
import { PdfViewer } from './PdfViewer'
import { SignatureModal } from './SignatureModal'
import { Toolbar } from './Toolbar'
import './EditorLayout.css'

interface EditorLayoutProps {
  document: PdfDocumentState
  initialEditor?: SavedEditorState
  onClose: () => void
}

export function EditorLayout({ document, initialEditor, onClose }: EditorLayoutProps) {
  const { pdf, pageCount, loading, error } = usePdfDocument(document.pdfBytes)
  const editor = useEditorState(initialEditor)
  const [downloading, setDownloading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [signatureModalOpen, setSignatureModalOpen] = useState(false)
  const saveTimerRef = useRef<number | null>(null)

  const totalPages = pageCount || document.pageCount || 1

  const persistSession = useCallback(async () => {
    if (!editor.hasChanges) return
    await saveSession(buildSavedSession(document.fileName, editor.snapshot), document.pdfBytes)
  }, [document.fileName, document.pdfBytes, editor.hasChanges, editor.snapshot])

  const handleSaveProgress = useCallback(async () => {
    setSaving(true)
    try {
      await persistSession()
      setSaveNotice('Progress saved locally')
      window.setTimeout(() => setSaveNotice(null), 2500)
    } finally {
      setSaving(false)
    }
  }, [persistSession])

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      const bytes = await exportPdfWithEdits(
        document.pdfBytes,
        editor.blocks,
        editor.strokes,
        editor.signatures,
      )
      downloadPdf(bytes, document.fileName)
    } finally {
      setDownloading(false)
    }
  }, [document.fileName, document.pdfBytes, editor.blocks, editor.strokes, editor.signatures])

  const handleClose = useCallback(async () => {
    if (editor.hasChanges) {
      await persistSession()
    }
    editor.reset()
    onClose()
  }, [editor, onClose, persistSession])

  // Auto-save every 5 seconds when there are changes
  useEffect(() => {
    if (!editor.hasChanges) return
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      void persistSession()
    }, 5000)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [editor.hasChanges, editor.snapshot, persistSession])

  // Warn on refresh/close and save before leaving
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!editor.hasChanges) return
      void persistSession()
      e.preventDefault()
      e.returnValue = 'You have unsaved changes. Your progress is saved locally and can be resumed.'
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [editor.hasChanges, persistSession])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      if (!isInput) {
        if (e.key === 't' || e.key === 'T') editor.setTool('text')
        if (e.key === 'v' || e.key === 'V') editor.setTool('select')
        if (e.key === 'p' || e.key === 'P') editor.setTool('pen')
        if (e.key === 'h' || e.key === 'H') editor.setTool('highlighter')
        if ((e.key === 'Delete' || e.key === 'Backspace') && editor.selectedId) {
          e.preventDefault()
          editor.deleteBlock(editor.selectedId)
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && editor.selectedSignatureId) {
          e.preventDefault()
          editor.deleteSignature(editor.selectedSignatureId)
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void handleSaveProgress()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editor, handleSaveProgress])

  const statusMessage = (() => {
    switch (editor.tool) {
      case 'text':
        return 'Click on the page to add a text field'
      case 'pen':
        return 'Draw on the page to sign or write · Progress auto-saves locally'
      case 'highlighter':
        return 'Drag over the page to highlight · Progress auto-saves locally'
      case 'signature':
        return 'Click on the document where your signature should appear'
      default:
        return 'Select text or signatures to move · Use Sign in the sidebar for DocuSign-style signing'
    }
  })()

  if (error) {
    return (
      <div className="editor-layout editor-layout--loading">
        <div className="editor-loading editor-loading--error">
          <p>Could not open PDF: {error}</p>
          <button type="button" onClick={() => void handleClose()}>
            Go back
          </button>
        </div>
      </div>
    )
  }

  if (loading || !pdf) {
    return (
      <div className="editor-layout editor-layout--loading">
        <div className="editor-loading">
          <div className="editor-loading__spinner" />
          <p>Loading document…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-layout">
      <Toolbar
        zoom={editor.zoom}
        onZoomChange={editor.setZoom}
        onDownload={() => void handleDownload()}
        onSave={() => void handleSaveProgress()}
        downloading={downloading}
        saving={saving}
        saveNotice={saveNotice}
        fileName={document.fileName}
        onClose={() => void handleClose()}
        currentPage={editor.currentPage}
        pageCount={totalPages}
        onPageChange={editor.setCurrentPage}
      />

      <div className="editor-layout__body">
        <EditSidebar
          tool={editor.tool}
          onToolChange={editor.setTool}
          selectedBlock={editor.selectedBlock}
          textStyle={editor.textStyle}
          inkStyle={editor.inkStyle}
          onStyleChange={editor.applyStyleToSelected}
          onInkStyleChange={editor.applyInkStyle}
          onDelete={() => {
            if (editor.selectedId) editor.deleteBlock(editor.selectedId)
            if (editor.selectedSignatureId) editor.deleteSignature(editor.selectedSignatureId)
          }}
          onOpenSignature={() => setSignatureModalOpen(true)}
          pageCount={totalPages}
          currentPage={editor.currentPage}
          onPageChange={editor.setCurrentPage}
        />

        <PdfViewer
          pdf={pdf}
          pageCount={totalPages}
          scale={editor.zoom}
          currentPage={editor.currentPage}
          onScaleChange={editor.setZoom}
          tool={editor.tool}
          blocks={editor.blocks}
          strokes={editor.strokes}
          signatures={editor.signatures}
          inkStyle={editor.inkStyle}
          selectedId={editor.selectedId}
          selectedSignatureId={editor.selectedSignatureId}
          onSelect={editor.setSelectedId}
          onSelectSignature={editor.setSelectedSignatureId}
          onUpdateBlock={editor.updateBlock}
          onDeleteBlock={editor.deleteBlock}
          onUpdateSignature={editor.updateSignature}
          onDeleteSignature={editor.deleteSignature}
          onAddText={editor.addTextField}
          onPlaceSignature={editor.placeSignature}
          onStrokeStart={editor.startStroke}
          onStrokeAppend={editor.appendStrokePoint}
        />
      </div>

      <footer className="editor-status">
        <span>{statusMessage}</span>
        <span className="editor-status__privacy">
          {editor.hasChanges ? 'Changes saved locally in this browser' : 'All processing happens locally in your browser'}
        </span>
      </footer>

      <SignatureModal
        open={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        onAdopt={(imageDataUrl) => {
          setSignatureModalOpen(false)
          editor.beginSignaturePlacement(imageDataUrl)
        }}
      />
    </div>
  )
}

export async function discardSavedSession() {
  await clearSession()
}
