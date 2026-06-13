import { useCallback, useEffect, useState } from 'react'
import type { PdfDocumentState } from '../types/editor'
import { downloadPdf, exportPdfWithEdits } from '../lib/pdfExporter'
import { useEditorState } from '../hooks/useEditorState'
import { usePdfDocument } from '../hooks/usePdfDocument'
import { EditSidebar } from './EditSidebar'
import { PdfViewer } from './PdfViewer'
import { Toolbar } from './Toolbar'
import './EditorLayout.css'

interface EditorLayoutProps {
  document: PdfDocumentState
  onClose: () => void
}

export function EditorLayout({ document, onClose }: EditorLayoutProps) {
  const { pdf, pageCount, loading, error } = usePdfDocument(document.pdfBytes)
  const editor = useEditorState()
  const [downloading, setDownloading] = useState(false)

  const totalPages = pageCount || document.pageCount || 1

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      const bytes = await exportPdfWithEdits(document.pdfBytes, editor.blocks)
      downloadPdf(bytes, document.fileName)
    } finally {
      setDownloading(false)
    }
  }, [document.fileName, document.pdfBytes, editor.blocks])

  const handleClose = useCallback(() => {
    editor.reset()
    onClose()
  }, [editor, onClose])

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
        if ((e.key === 'Delete' || e.key === 'Backspace') && editor.selectedId) {
          e.preventDefault()
          editor.deleteBlock(editor.selectedId)
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void handleDownload()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editor, handleDownload])

  if (error) {
    return (
      <div className="editor-layout editor-layout--loading">
        <div className="editor-loading editor-loading--error">
          <p>Could not open PDF: {error}</p>
          <button type="button" onClick={handleClose}>
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
        downloading={downloading}
        fileName={document.fileName}
        onClose={handleClose}
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
          onStyleChange={editor.applyStyleToSelected}
          onDelete={() => editor.selectedId && editor.deleteBlock(editor.selectedId)}
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
          selectedId={editor.selectedId}
          onSelect={editor.setSelectedId}
          onUpdateBlock={editor.updateBlock}
          onDeleteBlock={editor.deleteBlock}
          onAddText={editor.addTextField}
          onPageBlocksExtracted={editor.addPageBlocks}
        />
      </div>

      <footer className="editor-status">
        <span>
          {editor.tool === 'text'
            ? 'Click on the page to add a text field'
            : 'Text blocks are outlined · Click to select · Drag to move · Delete to remove · Double-click to edit'}
        </span>
        <span className="editor-status__privacy">All processing happens locally in your browser</span>
      </footer>
    </div>
  )
}
