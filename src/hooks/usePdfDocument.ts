import { useCallback, useEffect, useRef, useState } from 'react'
import { openPdfDocument } from '../lib/pdfSetup'
import type { PDFDocumentProxy } from 'pdfjs-dist'

export function usePdfDocument(pdfBytes: Uint8Array | null) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadIdRef = useRef(0)

  useEffect(() => {
    if (!pdfBytes) {
      setPdf(null)
      setPageCount(0)
      return
    }

    const loadId = ++loadIdRef.current
    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        const doc = await openPdfDocument(pdfBytes).promise

        if (loadId !== loadIdRef.current) {
          await doc.destroy()
          return
        }

        setPageCount(doc.numPages)
        setPdf(doc)
      } catch (err) {
        if (loadId === loadIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF')
        }
      } finally {
        if (loadId === loadIdRef.current) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      loadIdRef.current++
    }
  }, [pdfBytes])

  const destroy = useCallback(() => {
    pdf?.destroy()
    setPdf(null)
  }, [pdf])

  return { pdf, pageCount, loading, error, destroy }
}
