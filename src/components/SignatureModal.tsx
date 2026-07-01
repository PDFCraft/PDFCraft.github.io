import { useCallback, useEffect, useRef, useState } from 'react'
import type { SavedSignature } from '../lib/signatureUtils'
import {
  fileToDataUrl,
  loadSavedSignature,
  renderTypedSignature,
  saveSavedSignature,
  trimSignatureCanvas,
} from '../lib/signatureUtils'
import './SignatureModal.css'

type Tab = 'draw' | 'type' | 'upload'

interface SignatureModalProps {
  open: boolean
  onClose: () => void
  onAdopt: (imageDataUrl: string, remember: boolean) => void
}

export function SignatureModal({ open, onClose, onAdopt }: SignatureModalProps) {
  const [tab, setTab] = useState<Tab>('draw')
  const [typedName, setTypedName] = useState('')
  const [remember, setRemember] = useState(true)
  const [saved, setSaved] = useState<SavedSignature | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (open) {
      setSaved(loadSavedSignature())
      setPreview(null)
      setUploadPreview(null)
      setTypedName('')
      clearCanvas()
    }
  }, [open])

  useEffect(() => {
    if (tab === 'type') {
      setPreview(renderTypedSignature(typedName))
    }
  }, [tab, typedName])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const getCanvasPoint = (e: React.PointerEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handleDrawStart = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    canvas.setPointerCapture(e.pointerId)
    drawing.current = true
    lastPoint.current = getCanvasPoint(e, canvas)
  }

  const handleDrawMove = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const canvas = canvasRef.current
    if (!canvas || !lastPoint.current) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const point = getCanvasPoint(e, canvas)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPoint.current = point
  }

  const handleDrawEnd = (e: React.PointerEvent) => {
    if (!drawing.current) return
    drawing.current = false
    lastPoint.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const handleUpload = async (file: File | undefined) => {
    if (!file?.type.startsWith('image/')) return
    const dataUrl = await fileToDataUrl(file)
    setUploadPreview(dataUrl)
  }

  const handleAdopt = useCallback(() => {
    let imageDataUrl: string | null = null
    if (tab === 'draw' && canvasRef.current) {
      imageDataUrl = trimSignatureCanvas(canvasRef.current)
    } else if (tab === 'type') {
      imageDataUrl = renderTypedSignature(typedName)
    } else if (tab === 'upload') {
      imageDataUrl = uploadPreview
    }
    if (!imageDataUrl) return
    if (remember) saveSavedSignature(imageDataUrl)
    onAdopt(imageDataUrl, remember)
  }, [onAdopt, remember, tab, typedName, uploadPreview])

  const handleUseSaved = () => {
    if (!saved) return
    onAdopt(saved.imageDataUrl, true)
  }

  const canAdopt =
    tab === 'draw' || (tab === 'type' && typedName.trim().length > 0) || (tab === 'upload' && uploadPreview)

  if (!open) return null

  return (
    <div className="signature-modal__backdrop" onClick={onClose}>
      <div className="signature-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="signature-modal__header">
          <h2>Adopt your signature</h2>
          <p>Create a signature to place on your document, just like DocuSign.</p>
          <button type="button" className="signature-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {saved && (
          <div className="signature-modal__saved">
            <div>
              <strong>Use saved signature</strong>
              <img src={saved.imageDataUrl} alt="Saved signature" />
            </div>
            <button type="button" className="signature-modal__use-saved" onClick={handleUseSaved}>
              Use saved
            </button>
          </div>
        )}

        <div className="signature-modal__tabs">
          {(['draw', 'type', 'upload'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`signature-modal__tab ${tab === t ? 'signature-modal__tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'draw' ? 'Draw' : t === 'type' ? 'Type' : 'Upload'}
            </button>
          ))}
        </div>

        <div className="signature-modal__body">
          {tab === 'draw' && (
            <div className="signature-modal__pad-wrap">
              <canvas
                ref={canvasRef}
                className="signature-modal__pad"
                width={560}
                height={180}
                onPointerDown={handleDrawStart}
                onPointerMove={handleDrawMove}
                onPointerUp={handleDrawEnd}
                onPointerCancel={handleDrawEnd}
              />
              <button type="button" className="signature-modal__clear" onClick={clearCanvas}>
                Clear
              </button>
            </div>
          )}

          {tab === 'type' && (
            <div className="signature-modal__type">
              <label>
                <span>Full name</span>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Your name"
                  autoFocus
                />
              </label>
              {preview && (
                <div className="signature-modal__preview">
                  <img src={preview} alt="Signature preview" />
                </div>
              )}
            </div>
          )}

          {tab === 'upload' && (
            <div className="signature-modal__upload">
              <label className="signature-modal__upload-btn">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => void handleUpload(e.target.files?.[0])}
                />
                Choose image
              </label>
              {uploadPreview && (
                <div className="signature-modal__preview">
                  <img src={uploadPreview} alt="Uploaded signature" />
                </div>
              )}
            </div>
          )}
        </div>

        <label className="signature-modal__remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Save signature for future documents
        </label>

        <footer className="signature-modal__footer">
          <button type="button" className="signature-modal__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="signature-modal__adopt"
            disabled={!canAdopt}
            onClick={handleAdopt}
          >
            Adopt &amp; place
          </button>
        </footer>
      </div>
    </div>
  )
}
