'use server'

import { auth } from '@clerk/nextjs/server'
import { getDb, initSchema } from './db'
import { encrypt, decrypt } from './encrypt'
import type { Review, Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

// Lazily initialize the schema once per cold start
let schemaReady = false
async function ensureSchema() {
  if (!schemaReady) {
    await initSchema()
    schemaReady = true
  }
}

// ── Reviews ────────────────────────────────────────────────────────────────

export async function fetchReviews(): Promise<Review[]> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  await ensureSchema()

  const sql = getDb()
  const rows = await sql`
    SELECT id, type, date, completed_at, is_draft, answers
    FROM reviews
    WHERE user_id = ${userId}
    ORDER BY date DESC
  `
  return rows.map(rowToReview)
}

export async function upsertReview(review: Review): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  await ensureSchema()

  const sql = getDb()
  await sql`
    INSERT INTO reviews (id, user_id, type, date, completed_at, is_draft, answers, updated_at)
    VALUES (
      ${review.id},
      ${userId},
      ${review.type},
      ${review.date},
      ${review.completedAt ?? null},
      ${review.isDraft},
      ${encrypt(JSON.stringify(review.answers))},
      NOW()
    )
    ON CONFLICT (id, user_id) DO UPDATE SET
      completed_at = EXCLUDED.completed_at,
      is_draft     = EXCLUDED.is_draft,
      answers      = EXCLUDED.answers,
      updated_at   = NOW()
  `
}

// ── Settings ───────────────────────────────────────────────────────────────

export async function fetchSettings(): Promise<Settings> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  await ensureSchema()

  const sql = getDb()
  const rows = await sql`
    SELECT settings FROM user_settings WHERE user_id = ${userId}
  `
  if (rows.length === 0) return DEFAULT_SETTINGS
  return { ...DEFAULT_SETTINGS, ...(rows[0].settings as Partial<Settings>) }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  await ensureSchema()

  const sql = getDb()
  await sql`
    INSERT INTO user_settings (user_id, settings, updated_at)
    VALUES (${userId}, ${JSON.stringify(settings)}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      settings   = EXCLUDED.settings,
      updated_at = NOW()
  `
}

// ── Helpers ────────────────────────────────────────────────────────────────

function rowToReview(row: Record<string, unknown>): Review {
  return {
    id: row.id as string,
    type: row.type as Review['type'],
    date: row.date as string,
    completedAt: (row.completed_at as string | null) ?? null,
    isDraft: row.is_draft as boolean,
    answers: JSON.parse(decrypt(row.answers as string)) as Review['answers'],
  }
}
