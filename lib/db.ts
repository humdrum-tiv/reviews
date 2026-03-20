import { neon } from '@neondatabase/serverless'

export function getDb() {
  return neon(process.env.DATABASE_URL!)
}

/**
 * Create tables if they don't exist. Safe to call multiple times.
 */
export async function initSchema(): Promise<void> {
  const sql = getDb()

  await sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id          TEXT        NOT NULL,
      user_id     TEXT        NOT NULL,
      type        TEXT        NOT NULL,
      date        TEXT        NOT NULL,
      completed_at TIMESTAMPTZ,
      is_draft    BOOLEAN     NOT NULL DEFAULT true,
      answers     JSONB       NOT NULL DEFAULT '[]',
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id, user_id)
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS reviews_user_date ON reviews (user_id, date)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id    TEXT        PRIMARY KEY,
      settings   JSONB       NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}
