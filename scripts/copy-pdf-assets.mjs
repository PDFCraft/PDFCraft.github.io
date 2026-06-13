import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const cmapsSrc = join(root, 'node_modules/pdfjs-dist/cmaps')
const fontsSrc = join(root, 'node_modules/pdfjs-dist/standard_fonts')

mkdirSync(publicDir, { recursive: true })

if (existsSync(cmapsSrc)) {
  cpSync(cmapsSrc, join(publicDir, 'cmaps'), { recursive: true })
}

if (existsSync(fontsSrc)) {
  cpSync(fontsSrc, join(publicDir, 'standard_fonts'), { recursive: true })
}

console.log('Copied PDF.js cmaps and standard fonts to public/')
