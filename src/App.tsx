import { useCallback, useState } from 'react'
import type { PdfDocumentState } from './types/editor'
import { loadPdfFromFile } from './lib/pdfLoader'
import { EditorLayout } from './components/EditorLayout'
import { UploadScreen } from './components/UploadScreen'
import './styles/global.css'

function App() {
  const [document, setDocument] = useState<PdfDocumentState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      setError('File exceeds 100 MB limit. Please choose a smaller PDF.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const doc = await loadPdfFromFile(file)
      setDocument(doc)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this PDF.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleClose = useCallback(() => {
    setDocument(null)
    setError(null)
  }, [])

  if (document) {
    return <EditorLayout document={document} onClose={handleClose} />
  }

  return <UploadScreen onFileSelect={handleFileSelect} loading={loading} error={error} />
}

export default App
