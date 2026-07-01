import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { TextBlock } from '../types/editor'

const WHITE_OUT_PADDING = 10

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

/** Bounds in top-left coordinates (same as editor state). */
function getCoverBounds(block: TextBlock): TopBounds {
  const original = block.originalBounds
  if (!original) {
    return { x: block.x, y: block.y, width: block.width, height: block.height }
  }

  const x = Math.min(block.x, original.x)
  const y = Math.min(block.y, original.y)
  const right = Math.max(block.x + block.width, original.x + original.width)
  const bottom = Math.max(block.y + block.height, original.y + original.height)

  return { x, y, width: right - x, height: bottom - y }
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

export async function exportPdfWithEdits(
  pdfBytes: Uint8Array,
  blocks: TextBlock[],
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

  for (const [pageIndex, pageBlocks] of byPage) {
    const page = pdfDoc.getPage(pageIndex)
    const { height: pageHeight } = page.getSize()

    // Pass 1: white-out every edited, deleted, or user-added region
    for (const block of pageBlocks) {
      if (!shouldWhiteOut(block)) continue
      drawWhiteOut(page, pageHeight, getCoverBounds(block))
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
