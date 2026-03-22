import { neon } from '@neondatabase/serverless'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedDb: any = null

export function getDb() {
  if (!cachedDb) {
    cachedDb = neon(process.env.DATABASE_URL!)
  }
  return cachedDb as ReturnType<typeof neon<false, false>>
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
      answers     TEXT        NOT NULL DEFAULT '[]',
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id, user_id)
    )
  `

  // Migrate existing databases: convert answers from JSONB to TEXT so it can
  // hold encrypted ciphertext. Safe to run on already-migrated schemas.
  await sql`
    DO $$
    BEGIN
      IF (
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'reviews' AND column_name = 'answers'
      ) = 'jsonb' THEN
        ALTER TABLE reviews ALTER COLUMN answers TYPE TEXT USING answers::text;
      END IF;
    END $$
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
