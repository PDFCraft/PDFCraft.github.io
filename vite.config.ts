import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: org site uses '/', project site uses '/repo-name/'
const base = process.env.PAGES_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
  optimizeDeps: {
    // Pre-bundling strips PDF.js polyfills (e.g. Map.getOrInsertComputed)
    exclude: ['pdfjs-dist'],
  },
})
