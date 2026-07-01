import { useCallback, useEffect, useState } from 'react'
import type { PdfDocumentState, SavedEditorState } from './types/editor'
import { loadPdfFromFile } from './lib/pdfLoader'
import { loadSession } from './lib/sessionStorage'
import { EditorLayout, discardSavedSession } from './components/EditorLayout'
import { UploadScreen } from './components/UploadScreen'
import './styles/global.css'

function App() {
  const [document, setDocument] = useState<PdfDocumentState | null>(null)
  const [initialEditor, setInitialEditor] = useState<SavedEditorState | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedSession, setSavedSession] = useState<{
    fileName: string
    savedAt: number
  } | null>(null)

  useEffect(() => {
    void loadSession().then((stored) => {
      if (!stored) return
      setSavedSession({
        fileName: stored.session.fileName,
        savedAt: stored.session.savedAt,
      })
    })
  }, [])

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      setError('File exceeds 100 MB limit. Please choose a smaller PDF.')
      return
    }

    setLoading(true)
    setError(null)
    setInitialEditor(undefined)

    try {
      const doc = await loadPdfFromFile(file)
      await discardSavedSession()
      setSavedSession(null)
      setDocument(doc)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this PDF.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleResumeSession = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const stored = await loadSession()
      if (!stored) {
        setSavedSession(null)
        return
      }
      setInitialEditor({
        ...stored.session.editor,
        signatures: stored.session.editor.signatures ?? [],
      })
      setDocument({
        fileName: stored.session.fileName,
        pdfBytes: stored.pdfBytes,
        pageCount: 0,
        pageDimensions: [],
      })
      setSavedSession({
        fileName: stored.session.fileName,
        savedAt: stored.session.savedAt,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore saved session.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDiscardSaved = useCallback(async () => {
    await discardSavedSession()
    setSavedSession(null)
  }, [])

  const handleClose = useCallback(() => {
    setDocument(null)
    setInitialEditor(undefined)
    setError(null)
    void loadSession().then((stored) => {
      if (!stored) {
        setSavedSession(null)
        return
      }
      setSavedSession({
        fileName: stored.session.fileName,
        savedAt: stored.session.savedAt,
      })
    })
  }, [])

  if (document) {
    return (
      <EditorLayout
        document={document}
        initialEditor={initialEditor}
        onClose={handleClose}
      />
    )
  }

  return (
    <UploadScreen
      onFileSelect={handleFileSelect}
      loading={loading}
      error={error}
      savedSession={savedSession}
      onResume={handleResumeSession}
      onDiscardSaved={handleDiscardSaved}
    />
  )
}

export default App
