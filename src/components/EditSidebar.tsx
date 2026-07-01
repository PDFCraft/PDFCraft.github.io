import type { EditorTool, InkStyle, TextBlock, TextStyle } from '../types/editor'
import { FONT_OPTIONS, HIGHLIGHTER_WIDTHS, INK_COLORS, PEN_WIDTHS } from '../types/editor'
import { IconHighlighter, IconPen, IconSelect, IconText, IconTrash } from './icons'
import './EditSidebar.css'

interface EditSidebarProps {
  tool: EditorTool
  onToolChange: (tool: EditorTool) => void
  selectedBlock: TextBlock | null
  textStyle: TextStyle
  inkStyle: InkStyle
  onStyleChange: (style: Partial<TextStyle>) => void
  onInkStyleChange: (style: Partial<InkStyle>) => void
  onDelete: () => void
  pageCount: number
  currentPage: number
  onPageChange: (page: number) => void
}

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 24, 32, 48]
const COLORS = ['#111827', '#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c']

export function EditSidebar({
  tool,
  onToolChange,
  selectedBlock,
  textStyle,
  inkStyle,
  onStyleChange,
  onInkStyleChange,
  onDelete,
  pageCount,
  currentPage,
  onPageChange,
}: EditSidebarProps) {
  const style = selectedBlock ?? textStyle
  const isInkTool = tool === 'pen' || tool === 'highlighter'
  const activeInkColor = tool === 'pen' ? inkStyle.penColor : inkStyle.highlighterColor
  const activeInkWidth = tool === 'pen' ? inkStyle.penWidth : inkStyle.highlighterWidth
  const widthOptions = tool === 'pen' ? PEN_WIDTHS : HIGHLIGHTER_WIDTHS

  return (
    <aside className="edit-sidebar">
      <div className="edit-sidebar__header">
        <h2>Edit</h2>
      </div>

      <div className="edit-sidebar__section">
        <h3>Tools</h3>
        <div className="edit-sidebar__tools">
          <button
            type="button"
            className={`edit-sidebar__tool ${tool === 'select' ? 'edit-sidebar__tool--active' : ''}`}
            onClick={() => onToolChange('select')}
            title="Select"
          >
            <IconSelect />
            <span>Select</span>
          </button>
          <button
            type="button"
            className={`edit-sidebar__tool ${tool === 'text' ? 'edit-sidebar__tool--active' : ''}`}
            onClick={() => onToolChange('text')}
            title="Add text"
          >
            <IconText />
            <span>Text</span>
          </button>
          <button
            type="button"
            className={`edit-sidebar__tool ${tool === 'pen' ? 'edit-sidebar__tool--active' : ''}`}
            onClick={() => onToolChange('pen')}
            title="Pen"
          >
            <IconPen />
            <span>Pen</span>
          </button>
          <button
            type="button"
            className={`edit-sidebar__tool ${tool === 'highlighter' ? 'edit-sidebar__tool--active' : ''}`}
            onClick={() => onToolChange('highlighter')}
            title="Highlighter"
          >
            <IconHighlighter />
            <span>Highlight</span>
          </button>
        </div>
        {tool === 'text' && (
          <p className="edit-sidebar__hint">Click on the page to place a new text field</p>
        )}
        {tool === 'pen' && (
          <p className="edit-sidebar__hint">Draw on the page to sign or annotate</p>
        )}
        {tool === 'highlighter' && (
          <p className="edit-sidebar__hint">Drag over text to highlight important sections</p>
        )}
        {tool === 'select' && (
          <p className="edit-sidebar__hint">
            Select text boxes to edit · Drag to move · Double-click to edit
          </p>
        )}
      </div>

      {isInkTool && (
        <div className="edit-sidebar__section">
          <h3>{tool === 'pen' ? 'Pen' : 'Highlighter'}</h3>
          <div className="edit-sidebar__field">
            <span>Color</span>
            <div className="edit-sidebar__colors">
              {INK_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`edit-sidebar__color ${activeInkColor === color ? 'edit-sidebar__color--active' : ''}`}
                  style={{ background: color, border: color === '#ffffff' ? '1px solid var(--border)' : undefined }}
                  onClick={() =>
                    onInkStyleChange(
                      tool === 'pen' ? { penColor: color } : { highlighterColor: color },
                    )
                  }
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>
          <div className="edit-sidebar__field">
            <span>Size</span>
            <div className="edit-sidebar__ink-sizes">
              {widthOptions.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`edit-sidebar__ink-size ${activeInkWidth === w ? 'edit-sidebar__ink-size--active' : ''}`}
                  onClick={() =>
                    onInkStyleChange(
                      tool === 'pen' ? { penWidth: w } : { highlighterWidth: w },
                    )
                  }
                  title={`${w}px`}
                >
                  <span style={{ width: Math.min(w * 2, 28), height: 3, background: activeInkColor }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isInkTool && (
        <div className="edit-sidebar__section">
          <h3>Format text</h3>
          {selectedBlock ? (
            <p className="edit-sidebar__hint">Editing selected text</p>
          ) : (
            <p className="edit-sidebar__hint">Select text on the page to format it</p>
          )}

          <label className="edit-sidebar__field">
            <span>Font</span>
            <select
              value={style.fontFamily}
              onChange={(e) => onStyleChange({ fontFamily: e.target.value })}
              disabled={!selectedBlock}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className="edit-sidebar__field">
            <span>Size</span>
            <select
              value={style.fontSize}
              onChange={(e) => onStyleChange({ fontSize: Number(e.target.value) })}
              disabled={!selectedBlock}
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </label>

          <div className="edit-sidebar__field">
            <span>Color</span>
            <div className="edit-sidebar__colors">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`edit-sidebar__color ${style.color === color ? 'edit-sidebar__color--active' : ''}`}
                  style={{ background: color }}
                  disabled={!selectedBlock}
                  onClick={() => onStyleChange({ color })}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="edit-sidebar__style-row">
            <button
              type="button"
              className={`edit-sidebar__style-btn ${style.bold ? 'edit-sidebar__style-btn--active' : ''}`}
              disabled={!selectedBlock}
              onClick={() => onStyleChange({ bold: !style.bold })}
            >
              B
            </button>
            <button
              type="button"
              className={`edit-sidebar__style-btn edit-sidebar__style-btn--italic ${style.italic ? 'edit-sidebar__style-btn--active' : ''}`}
              disabled={!selectedBlock}
              onClick={() => onStyleChange({ italic: !style.italic })}
            >
              I
            </button>
            {selectedBlock && (
              <button type="button" className="edit-sidebar__delete" onClick={onDelete} title="Delete text">
                <IconTrash />
              </button>
            )}
          </div>
        </div>
      )}

      {pageCount > 1 && (
        <div className="edit-sidebar__section edit-sidebar__section--pages">
          <h3>Pages</h3>
          <div className="edit-sidebar__pages">
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`edit-sidebar__page ${currentPage === i ? 'edit-sidebar__page--active' : ''}`}
                onClick={() => onPageChange(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
