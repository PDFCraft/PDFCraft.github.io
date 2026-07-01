import type { SavedEditorState, SavedSession } from '../types/editor'

const DB_NAME = 'pdfcraft-editor'
const DB_VERSION = 1
const SESSION_KEY = 'current'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions')
      }
    }
  })
}

interface StoredRecord {
  session: SavedSession
  pdfBytes: ArrayBuffer
}

export async function saveSession(session: SavedSession, pdfBytes: Uint8Array): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite')
    const store = tx.objectStore('sessions')
    const record: StoredRecord = {
      session,
      pdfBytes: pdfBytes.slice().buffer,
    }
    store.put(record, SESSION_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadSession(): Promise<{ session: SavedSession; pdfBytes: Uint8Array } | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readonly')
    const store = tx.objectStore('sessions')
    const request = store.get(SESSION_KEY)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const record = request.result as StoredRecord | undefined
      if (!record?.session || !record.pdfBytes) {
        resolve(null)
        return
      }
      resolve({
        session: record.session,
        pdfBytes: new Uint8Array(record.pdfBytes),
      })
    }
  })
}

export async function clearSession(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite')
    tx.objectStore('sessions').delete(SESSION_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function buildSavedSession(
  fileName: string,
  editor: SavedEditorState,
): SavedSession {
  return {
    version: 1,
    fileName,
    savedAt: Date.now(),
    editor,
  }
}

export function hasEditorChanges(editor: SavedEditorState): boolean {
  const hasBlockEdits = editor.blocks.some(
    (b) => b.source === 'user' || b.modified || b.deleted,
  )
  const hasStrokes = editor.strokes.some((s) => s.points.length >= 2)
  return hasBlockEdits || hasStrokes
}
