import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { InkStroke, TextBlock } from '../types/editor'

/** Small bleed so anti-aliased PDF text edges are fully covered. */
const WHITE_OUT_PADDING = 2

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const value = parseInt(normalized, 16)
  return rgb(
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  )
}

function pickFont(block: TextBlock, fonts: Record<string, Awaited<ReturnType<PDFDocument['embedFont']>>>) {
  if (block.fontFamily.includes('Times')) return fonts.times
  if (block.fontFamily.includes('Courier')) return fonts.courier
  return fonts.helvetica
}

interface TopBounds {
  x: number
  y: number
  width: number
  height: number
}

function getCurrentBounds(block: TextBlock): TopBounds {
  return { x: block.x, y: block.y, width: block.width, height: block.height }
}

function positionMoved(block: TextBlock, original: TopBounds): boolean {
  return Math.abs(block.x - original.x) > 1 || Math.abs(block.y - original.y) > 1
}

/** White-out regions matching the visible box; only include original PDF location when text was moved. */
function getWhiteOutRegions(block: TextBlock): TopBounds[] {
  const current = getCurrentBounds(block)
  const regions: TopBounds[] = [current]

  const original = block.originalBounds
  if (original && block.source === 'pdf' && positionMoved(block, original)) {
    regions.push(original)
  }

  return regions
}

function shouldWhiteOut(block: TextBlock): boolean {
  if (block.deleted) return true
  if (block.source === 'user') return true
  return block.source === 'pdf' && block.modified
}

function shouldDrawText(block: TextBlock): boolean {
  return !block.deleted && block.text.trim().length > 0
}

function drawWhiteOut(page: ReturnType<PDFDocument['getPage']>, pageHeight: number, bounds: TopBounds) {
  const pdfY = pageHeight - bounds.y - bounds.height
  page.drawRectangle({
    x: bounds.x - WHITE_OUT_PADDING,
    y: Math.max(pdfY - WHITE_OUT_PADDING, 0),
    width: bounds.width + WHITE_OUT_PADDING * 2,
    height: bounds.height + WHITE_OUT_PADDING * 2,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  })
}

function drawStrokesOnPage(
  page: ReturnType<PDFDocument['getPage']>,
  pageHeight: number,
  strokes: InkStroke[],
) {
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue
    const color = hexToRgb(stroke.color)
    for (let i = 1; i < stroke.points.length; i++) {
      const prev = stroke.points[i - 1]
      const curr = stroke.points[i]
      page.drawLine({
        start: { x: prev.x, y: pageHeight - prev.y },
        end: { x: curr.x, y: pageHeight - curr.y },
        thickness: stroke.width,
        color,
        opacity: stroke.opacity,
        lineCap: 1, // Round
      })
    }
  }
}

export async function exportPdfWithEdits(
  pdfBytes: Uint8Array,
  blocks: TextBlock[],
  strokes: InkStroke[] = [],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const fonts = {
    helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
    helveticaBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    times: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    courier: await pdfDoc.embedFont(StandardFonts.Courier),
  }

  const byPage = new Map<number, TextBlock[]>()
  for (const block of blocks) {
    const list = byPage.get(block.pageIndex) ?? []
    list.push(block)
    byPage.set(block.pageIndex, list)
  }

  const strokesByPage = new Map<number, InkStroke[]>()
  for (const stroke of strokes) {
    const list = strokesByPage.get(stroke.pageIndex) ?? []
    list.push(stroke)
    strokesByPage.set(stroke.pageIndex, list)
  }

  const pageIndices = new Set([...byPage.keys(), ...strokesByPage.keys()])

  for (const pageIndex of pageIndices) {
    const page = pdfDoc.getPage(pageIndex)
    const { height: pageHeight } = page.getSize()
    const pageBlocks = byPage.get(pageIndex) ?? []
    const pageStrokes = strokesByPage.get(pageIndex) ?? []

    // Pass 1: white-out only the visible box (and former location if text was moved)
    for (const block of pageBlocks) {
      if (!shouldWhiteOut(block)) continue
      for (const region of getWhiteOutRegions(block)) {
        drawWhiteOut(page, pageHeight, region)
      }
    }

    // Pass 2: draw replacement / new text on top
    for (const block of pageBlocks) {
      if (!shouldDrawText(block)) continue
      if (block.source === 'pdf' && !block.modified) continue

      const font = block.bold ? fonts.helveticaBold : pickFont(block, fonts)
      const pdfY = pageHeight - block.y - block.fontSize * 0.85

      page.drawText(block.text, {
        x: block.x,
        y: Math.max(pdfY, 0),
        size: block.fontSize,
        font,
        color: hexToRgb(block.color),
        maxWidth: block.width > 0 ? block.width : undefined,
        lineHeight: block.fontSize * 1.25,
      })
    }

    // Pass 3: pen and highlighter strokes
    drawStrokesOnPage(page, pageHeight, pageStrokes)
  }

  return pdfDoc.save()
}

export function downloadPdf(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${fileName}-edited.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}
