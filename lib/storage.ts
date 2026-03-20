import { openDB, type IDBPDatabase } from 'idb'
import type { Review, Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

const DB_NAME = 'reviews-app'
const DB_VERSION = 1

type DB = IDBPDatabase<{
  reviews: {
    key: string
    value: Review
    indexes: { 'by-type': string; 'by-date': string; 'by-type-date': [string, string] }
  }
  settings: {
    key: string
    value: { key: string; value: unknown }
  }
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
        const reviewStore = db.createObjectStore('reviews', { keyPath: 'id' })
        reviewStore.createIndex('by-type', 'type')
        reviewStore.createIndex('by-date', 'date')
        reviewStore.createIndex('by-type-date', ['type', 'date'])

        db.createObjectStore('settings', { keyPath: 'key' })
        db.createObjectStore('fs-handles', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

// ── Reviews ────────────────────────────────────────────────────────────────

export async function saveReview(review: Review): Promise<void> {
  const db = await getDB()
  await db.put('reviews', review)
}

export async function getReview(id: string): Promise<Review | undefined> {
  const db = await getDB()
  return db.get('reviews', id)
}

export async function getAllReviews(): Promise<Review[]> {
  const db = await getDB()
  return db.getAll('reviews')
}

export async function getReviewsByType(type: string): Promise<Review[]> {
  const db = await getDB()
  return db.getAllFromIndex('reviews', 'by-type', type)
}

export async function getReviewsByDateRange(start: string, end: string): Promise<Review[]> {
  const db = await getDB()
  const all = await db.getAll('reviews')
  return all.filter((r) => r.date >= start && r.date <= end)
}

export async function getCompletedReviewIds(): Promise<Set<string>> {
  const db = await getDB()
  const all = await db.getAll('reviews')
  return new Set(all.filter((r) => !r.isDraft).map((r) => r.id))
}

export async function deleteReview(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('reviews', id)
}

// ── Settings ───────────────────────────────────────────────────────────────

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  const db = await getDB()
  const row = await db.get('settings', key)
  if (row === undefined) return DEFAULT_SETTINGS[key]
  return row.value as Settings[K]
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  const db = await getDB()
  await db.put('settings', { key, value })
}

export async function getAllSettings(): Promise<Settings> {
  const db = await getDB()
  const rows = await db.getAll('settings')
  const settings = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(settings as any)[row.key] = row.value
  }
  return settings
}

// ── File System Handle ────────────────────────────────────────────────────

export async function saveObsidianHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await getDB()
  await db.put('fs-handles', { key: 'obsidian', handle })
}

export async function getObsidianHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await getDB()
  const row = await db.get('fs-handles', 'obsidian')
  return row?.handle ?? null
}
