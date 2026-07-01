import { Util } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PDFPageProxy } from 'pdfjs-dist'
import { v4 as uuidv4 } from 'uuid'
import type { TextBlock } from '../types/editor'

interface RawItem {
  str: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
}

type BlockDraft = Omit<TextBlock, 'id' | 'pageIndex'>

function mergeLineItems(line: RawItem[]): BlockDraft {
  line.sort((a, b) => a.x - b.x)
  const text = line.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim()
  const x = line[0].x
  const y = line[0].y
  const fontSize = Math.round(line.reduce((s, i) => s + i.fontSize, 0) / line.length)
  const right = Math.max(...line.map((i) => i.x + i.width))
  const bottom = Math.max(...line.map((i) => i.y + i.height))
  const width = Math.max(right - x, text.length * fontSize * 0.45)
  const height = Math.max(bottom - y, fontSize * 1.2)

  return {
    text,
    x,
    y,
    width,
    height,
    fontSize,
    color: '#111827',
    fontFamily: 'Helvetica, Arial, sans-serif',
    bold: false,
    italic: false,
    deleted: false,
    modified: false,
    source: 'pdf',
    originalBounds: { x, y, width, height },
  }
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}

function overlapRatio(a: TopBounds, b: TopBounds): number {
  const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  const intersection = overlapX * overlapY
  const smallerArea = Math.min(a.width * a.height, b.width * b.height)
  return smallerArea > 0 ? intersection / smallerArea : 0
}

interface TopBounds {
  x: number
  y: number
  width: number
  height: number
}

function mergeBounds(a: TopBounds, b: TopBounds): TopBounds {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const right = Math.max(a.x + a.width, b.x + b.width)
  const bottom = Math.max(a.y + a.height, b.y + b.height)
  return { x, y, width: right - x, height: bottom - y }
}

function textsSimilar(a: string, b: string): boolean {
  const left = normalizeText(a)
  const right = normalizeText(b)
  if (!left || !right) return false
  if (left === right) return true
  if (left.length >= 4 && right.length >= 4 && (left.includes(right) || right.includes(left))) {
    return true
  }
  const shorter = left.length <= right.length ? left : right
  const longer = left.length > right.length ? left : right
  if (shorter.length >= 3 && longer.includes(shorter)) return true
  return false
}

/** Remove ghost/duplicate text layers common after re-exporting edited PDFs. */
function deduplicateBlocks(blocks: BlockDraft[]): BlockDraft[] {
  const sorted = [...blocks].sort((a, b) => b.width * b.height - a.width * a.height)
  const kept: BlockDraft[] = []

  for (const block of sorted) {
    // Short labels (e.g. "A", "1") skip dedup but must still be kept
    if (block.text.length <= 2) {
      kept.push(block)
      continue
    }

    let merged = false
    for (let i = 0; i < kept.length; i++) {
      const existing = kept[i]
      const overlap = overlapRatio(existing, block)

      if (overlap > 0.35 && textsSimilar(existing.text, block.text)) {
        if (block.text.length > existing.text.length) {
          const bounds = mergeBounds(existing, block)
          kept[i] = {
            ...block,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            originalBounds: bounds,
          }
        }
        merged = true
        break
      }

      // Drop tiny fragments sitting inside a larger block with similar content
      if (
        block.text.length <= 4 &&
        overlap > 0.6 &&
        textsSimilar(existing.text, block.text)
      ) {
        merged = true
        break
      }
    }

    if (!merged) kept.push(block)
  }

  return kept
}

export async function extractPageText(
  page: PDFPageProxy,
  pageIndex: number,
): Promise<TextBlock[]> {
  const viewport = page.getViewport({ scale: 1 })
  const pageHeight = viewport.height
  const textContent = await page.getTextContent()

  const items: RawItem[] = []

  for (const raw of textContent.items) {
    if (!('str' in raw) || !raw.str.trim()) continue

    const tx = Util.transform(viewport.transform, raw.transform)
    const fontSize = Math.max(Math.hypot(raw.transform[0], raw.transform[1]), 8)
    const x = tx[4]
    const yTop = pageHeight - tx[5] - fontSize * 0.85
    const width = raw.width > 0 ? raw.width : raw.str.length * fontSize * 0.55

    items.push({
      str: raw.str,
      x,
      y: yTop,
      width,
      height: fontSize * 1.25,
      fontSize,
    })
  }

  if (items.length === 0) return []

  items.sort((a, b) => a.y - b.y || a.x - b.x)

  // Group into lines
  const lines: RawItem[][] = []
  for (const item of items) {
    const line = lines.find((l) => Math.abs(l[0].y - item.y) < item.fontSize * 0.6)
    if (line) line.push(item)
    else lines.push([item])
  }

  const lineBlocks = lines.map((line) => mergeLineItems(line))

  // Merge lines into paragraph blocks (Acrobat-style larger rectangles)
  const paragraphs: BlockDraft[] = []
  let current = lineBlocks[0]

  for (let i = 1; i < lineBlocks.length; i++) {
    const next = lineBlocks[i]
    const gap = next.y - (current.y + current.height)
    const sameColumn = Math.abs(next.x - current.x) < current.width * 0.5

    if (gap < current.fontSize * 1.2 && sameColumn) {
      const bounds = mergeBounds(current, next)
      current = {
        ...current,
        text: `${current.text} ${next.text}`.trim(),
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        originalBounds: bounds,
      }
    } else {
      paragraphs.push(current)
      current = next
    }
  }
  paragraphs.push(current)

  const deduped = deduplicateBlocks(paragraphs)

  return deduped.map((p) => ({
    ...p,
    id: uuidv4(),
    pageIndex,
  }))
}
