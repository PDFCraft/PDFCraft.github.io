import { useCallback, useRef, useState } from 'react'
import { IconFile, IconLock, IconUpload } from './icons'
import './UploadScreen.css'

interface UploadScreenProps {
  onFileSelect: (file: File) => void
  loading?: boolean
  error?: string | null
}

export function UploadScreen({ onFileSelect, loading, error }: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || file.type !== 'application/pdf') return
      onFileSelect(file)
    },
    [onFileSelect],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleFile(e.dataTransfer.files[0])
    },
    [handleFile],
  )

  return (
    <div className="upload-screen">
      <div className="upload-screen__hero">
        <h1>PDF Text Editor</h1>
        <p className="upload-screen__subtitle">
          Add and edit text on any PDF — graphic, scanned, or text-based. Everything
          stays in your browser. Nothing is uploaded.
        </p>
      </div>

      <div
        className={`upload-dropzone ${dragOver ? 'upload-dropzone--active' : ''} ${loading ? 'upload-dropzone--loading' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <div className="upload-dropzone__icon">
          {loading ? <div className="upload-spinner" /> : <IconFile />}
        </div>

        <p className="upload-dropzone__title">
          {loading ? 'Opening PDF…' : 'Select or drop your PDF here'}
        </p>
        <p className="upload-dropzone__hint">Supports graphic and text PDFs up to 100 MB</p>

        {!loading && (
          <button
            type="button"
            className="upload-dropzone__button"
            onClick={(e) => {
              e.stopPropagation()
              inputRef.current?.click()
            }}
          >
            <IconUpload />
            Choose PDF
          </button>
        )}
      </div>

      {error && <p className="upload-screen__error">{error}</p>}

      <div className="upload-features">
        <div className="upload-feature">
          <IconLock />
          <div>
            <strong>Private by design</strong>
            <span>Files never leave your device</span>
          </div>
        </div>
        <div className="upload-feature">
          <span className="upload-feature__badge">T</span>
          <div>
            <strong>Text editing</strong>
            <span>Add, move, and style text boxes on any page</span>
          </div>
        </div>
        <div className="upload-feature">
          <span className="upload-feature__badge">↓</span>
          <div>
            <strong>Instant download</strong>
            <span>Export your edited PDF with one click</span>
          </div>
        </div>
      </div>
    </div>
  )
}
