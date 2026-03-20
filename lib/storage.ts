/**
 * IndexedDB storage — used exclusively for the File System Access API handle,
 * which is a browser object that cannot be serialised to a remote database.
 * All review data and settings are persisted in Neon via lib/actions.ts.
 */
import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'reviews-app'
const DB_VERSION = 1

type DB = IDBPDatabase<{
  'fs-handles': {
    key: string
    value: { key: string; handle: FileSystemDirectoryHandle }
  }
}>

let dbPromise: Promise<DB> | null = null

function getDB(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('fs-handles')) {
          db.createObjectStore('fs-handles', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

export async function saveObsidianHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await getDB()
  await db.put('fs-handles', { key: 'obsidian', handle })
}

export async function getObsidianHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await getDB()
  const row = await db.get('fs-handles', 'obsidian')
  return row?.handle ?? null
}
