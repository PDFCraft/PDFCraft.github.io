# ClearPDF Editor

Edit PDF text in your browser — upload, add and resize text boxes, and download. Everything runs locally; your files never leave your device.

**Live demo:** [https://pdfcraft.github.io/](https://pdfcraft.github.io/)

## Features

- **100% client-side** — PDFs never leave your device
- **Edit existing text** — select PDF text blocks, move, edit, or delete
- **Add text boxes** — place new text anywhere with font, size, color, bold, and italic
- **Resize text boxes** — drag handles to enlarge user-added boxes
- **Pan & zoom** — navigate documents comfortably
- **One-click export** — download your edited PDF instantly

## Getting started

```bash
npm install
npm run dev
```

Open the URL shown in your terminal (usually `http://localhost:5173`).

## Usage

1. **Upload** — drag and drop a PDF or click to browse
2. **Add text** — use **Add Text** in the sidebar, then click on the page
3. **Edit** — double-click any text block; drag to move; drag handles to resize
4. **Style** — change font, size, and color from the Edit sidebar
5. **Download** — click **Download PDF** to save your edited file

## Tech stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [PDF.js](https://mozilla.github.io/pdf.js/) — render PDFs in the browser
- [pdf-lib](https://pdf-lib.js.org/) — embed edited text on export

## Build for production

```bash
npm run build
npm run preview
```
