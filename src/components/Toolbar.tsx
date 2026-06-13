import { IconDownload, IconZoomIn, IconZoomOut } from './icons'
import './Toolbar.css'

interface ToolbarProps {
  zoom: number
  onZoomChange: (zoom: number) => void
  onDownload: () => void
  downloading: boolean
  fileName: string
  onClose: () => void
  currentPage: number
  pageCount: number
  onPageChange: (page: number) => void
}

export function Toolbar({
  zoom,
  onZoomChange,
  onDownload,
  downloading,
  fileName,
  onClose,
  currentPage,
  pageCount,
  onPageChange,
}: ToolbarProps) {
  return (
    <header className="toolbar toolbar--minimal">
      <div className="toolbar__left">
        <button type="button" className="toolbar__brand" onClick={onClose} title="Close document">
          <span className="toolbar__logo">PDF</span>
          <span className="toolbar__filename" title={fileName}>
            {fileName}
          </span>
        </button>
      </div>

      <div className="toolbar__center">
        <div className="toolbar__group">
          <button
            type="button"
            className="toolbar__icon-btn"
            onClick={() => onZoomChange(Math.max(0.25, zoom - 0.15))}
            title="Zoom out"
          >
            <IconZoomOut />
          </button>
          <span className="toolbar__zoom">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="toolbar__icon-btn"
            onClick={() => onZoomChange(Math.min(3, zoom + 0.15))}
            title="Zoom in"
          >
            <IconZoomIn />
          </button>
        </div>
      </div>

      <div className="toolbar__right">
        <div className="toolbar__page-nav">
          <button
            type="button"
            className="toolbar__icon-btn"
            disabled={currentPage <= 0}
            onClick={() => onPageChange(currentPage - 1)}
          >
            ‹
          </button>
          <span className="toolbar__page-info">
            {currentPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="toolbar__icon-btn"
            disabled={currentPage >= pageCount - 1}
            onClick={() => onPageChange(currentPage + 1)}
          >
            ›
          </button>
        </div>

        <button
          type="button"
          className="toolbar__download"
          onClick={onDownload}
          disabled={downloading}
        >
          <IconDownload />
          {downloading ? 'Exporting…' : 'Download PDF'}
        </button>
      </div>
    </header>
  )
}
