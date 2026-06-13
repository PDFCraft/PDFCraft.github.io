import type { EditorTool, TextBlock, TextStyle } from '../types/editor'
import { FONT_OPTIONS } from '../types/editor'
import { IconText, IconTrash } from './icons'
import './EditSidebar.css'

interface EditSidebarProps {
  tool: EditorTool
  onToolChange: (tool: EditorTool) => void
  selectedBlock: TextBlock | null
  textStyle: TextStyle
  onStyleChange: (style: Partial<TextStyle>) => void
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
  onStyleChange,
  onDelete,
  pageCount,
  currentPage,
  onPageChange,
}: EditSidebarProps) {
  const style = selectedBlock ?? textStyle

  return (
    <aside className="edit-sidebar">
      <div className="edit-sidebar__header">
        <h2>Edit</h2>
      </div>

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

      <div className="edit-sidebar__section">
        <h3>Add content</h3>
        <button
          type="button"
          className={`edit-sidebar__add-text ${tool === 'text' ? 'edit-sidebar__add-text--active' : ''}`}
          onClick={() => onToolChange(tool === 'text' ? 'select' : 'text')}
        >
          <IconText />
          <span>Text</span>
        </button>
        {tool === 'text' && (
          <p className="edit-sidebar__hint">Click on the page to place a new text field</p>
        )}
        {tool === 'select' && (
          <p className="edit-sidebar__hint">
            All PDF text appears in boxes. Select, drag, delete, or double-click to edit.
          </p>
        )}
      </div>

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
