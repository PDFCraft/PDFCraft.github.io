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

function mergeLineItems(line: RawItem[]): Omit<TextBlock, 'id' | 'pageIndex'> {
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
  const paragraphs: Omit<TextBlock, 'id' | 'pageIndex'>[] = []
  let current = lineBlocks[0]

  for (let i = 1; i < lineBlocks.length; i++) {
    const next = lineBlocks[i]
    const gap = next.y - (current.y + current.height)
    const sameColumn = Math.abs(next.x - current.x) < current.width * 0.5

    if (gap < current.fontSize * 1.2 && sameColumn) {
      const x = Math.min(current.x, next.x)
      const y = current.y
      const right = Math.max(current.x + current.width, next.x + next.width)
      const bottom = Math.max(current.y + current.height, next.y + next.height)
      const width = right - x
      const height = bottom - y
      current = {
        ...current,
        text: `${current.text} ${next.text}`.trim(),
        x,
        y,
        width,
        height,
        originalBounds: { x, y, width, height },
      }
    } else {
      paragraphs.push(current)
      current = next
    }
  }
  paragraphs.push(current)

  return paragraphs.map((p) => ({
    ...p,
    id: uuidv4(),
    pageIndex,
  }))
}
