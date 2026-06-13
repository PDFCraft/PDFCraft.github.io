import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { TextBlock } from '../types/editor'

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
    const { height } = page.getSize()

    for (const block of pageBlocks) {
      const bounds = block.originalBounds ?? block
      const needsCover = block.source === 'pdf' && (block.deleted || block.modified)

      if (needsCover) {
        const pdfY = height - bounds.y - bounds.height
        page.drawRectangle({
          x: bounds.x - 3,
          y: Math.max(pdfY - 3, 0),
          width: bounds.width + 6,
          height: bounds.height + 6,
          color: rgb(1, 1, 1),
        })
      }

      if (block.deleted || !block.text.trim()) continue

      // If moved, also cover the gap at original position is handled via originalBounds above
      const font = block.bold ? fonts.helveticaBold : pickFont(block, fonts)
      const pdfY = height - block.y - block.fontSize * 0.85

      page.drawText(block.text, {
        x: block.x,
        y: Math.max(pdfY, 0),
        size: block.fontSize,
        font,
        color: hexToRgb(block.color),
        maxWidth: block.width > 0 ? block.width : undefined,
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
