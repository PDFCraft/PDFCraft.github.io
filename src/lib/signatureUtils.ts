export type SignatureMode = 'draw' | 'type' | 'upload'

export interface SavedSignature {
  imageDataUrl: string
  createdAt: number
}

export interface SignaturePlacement {
  id: string
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  imageDataUrl: string
}

const STORAGE_KEY = 'pdfcraft-saved-signature'

export function loadSavedSignature(): SavedSignature | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedSignature
    if (!parsed.imageDataUrl?.startsWith('data:image/')) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSavedSignature(imageDataUrl: string): void {
  const record: SavedSignature = { imageDataUrl, createdAt: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
}

export function clearSavedSignature(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function renderTypedSignature(text: string, color = '#111827'): string {
  const canvas = document.createElement('canvas')
  canvas.width = 520
  canvas.height = 160
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = color
  ctx.font = 'italic 52px "Brush Script MT", "Segoe Script", "Snell Roundhand", cursive'
  ctx.textBaseline = 'middle'
  ctx.fillText(text.trim() || 'Signature', 24, canvas.height / 2)
  return canvas.toDataURL('image/png')
}

export function trimSignatureCanvas(source: HTMLCanvasElement): string {
  const ctx = source.getContext('2d')
  if (!ctx) return source.toDataURL('image/png')

  const { width, height } = source
  const imageData = ctx.getImageData(0, 0, width, height)
  const { data } = imageData

  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let found = false

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 10) {
        found = true
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (!found) return source.toDataURL('image/png')

  const pad = 12
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)

  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1
  const cropped = document.createElement('canvas')
  cropped.width = cropW
  cropped.height = cropH
  const cropCtx = cropped.getContext('2d')!
  cropCtx.drawImage(source, minX, minY, cropW, cropH, 0, 0, cropW, cropH)
  return cropped.toDataURL('image/png')
}

export const DEFAULT_SIGNATURE_SIZE = { width: 180, height: 60 }
