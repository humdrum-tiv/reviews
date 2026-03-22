import { create } from 'zustand'
import type { Review, Settings, ReviewType } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import {
  fetchReviews,
  upsertReview,
  deleteReview as deleteReviewAction,
  fetchSettings,
  saveSettings,
} from '@/lib/actions'
import { saveObsidianHandle } from '@/lib/storage'
import { toISODate, getReviewsDueToday } from '@/lib/schedule'
import { QUESTIONS } from '@/lib/questions'

// Per-review debounce timers. Keyed by reviewId so concurrent reviews don't
// interfere with each other.
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()

// ── localStorage cache ────────────────────────────────────────────────────────
// We persist only completedIds and settings — no review content — so the UI
// can render the correct "nothing due / all done" state instantly on reopen
// without waiting for the server fetch.

const CACHE_KEY = 'reviews-cache-v1'

interface ReviewCache {
  completedIds: string[]
  settings: Settings
}

function readCache(): ReviewCache | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as ReviewCache) : null
  } catch {
    return null
  }
}

function writeCache(completedIds: Set<string>, settings: Settings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ completedIds: Array.from(completedIds), settings })
    )
  } catch {
    // Storage unavailable (private browsing, quota exceeded) — silently skip
  }
}

// ─────────────────────────────────────────────────────────────────────────────

interface ReviewStore {
  reviews: Review[]
  settings: Settings
  completedIds: Set<string>
  isLoaded: boolean
  isHydrated: boolean // true once localStorage cache has been applied client-side

  // Actions
  initFromCache: () => void
  loadAll: () => Promise<void>
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
  setObsidianFolder: (handle: FileSystemDirectoryHandle, path: string) => Promise<void>

  startReview: (type: ReviewType, date: string) => Review
  updateAnswer: (reviewId: string, questionId: string, text: string) => void
  completeReview: (reviewId: string) => Promise<Review | null>
  deleteReview: (reviewId: string) => Promise<void>
  getReview: (id: string) => Review | undefined

  getTodaysDue: () => ReviewType[]
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  reviews: [],
  settings: DEFAULT_SETTINGS,
  completedIds: new Set(),
  isLoaded: false,
  isHydrated: false,

  // Called from a useLayoutEffect in the dashboard so it runs synchronously
  // on the client before the first paint, eliminating the loading flash.
  initFromCache: () => {
    const cache = readCache()
    if (!cache) return
    set({
      settings: cache.settings,
      completedIds: new Set(cache.completedIds),
      isHydrated: true,
    })
  },

  loadAll: async () => {
    try {
      const [reviews, settings] = await Promise.all([
        fetchReviews(),
        fetchSettings(),
      ])
      const completedIds = new Set(reviews.filter((r) => !r.isDraft).map((r) => r.id))
      writeCache(completedIds, settings)
      set({ reviews, settings, completedIds, isLoaded: true })
    } catch (err) {
      console.error('Failed to load data:', err)
      set({ isLoaded: true })
    }
  },

  updateSetting: async (key, value) => {
    const next = { ...get().settings, [key]: value }
    await saveSettings(next)
    set({ settings: next })
    writeCache(get().completedIds, next)
  },

  setObsidianFolder: async (handle, path) => {
    // FileSystemDirectoryHandle can only be stored in IndexedDB (browser-only object)
    await saveObsidianHandle(handle)
    const next = { ...get().settings, obsidianFolderPath: path }
    await saveSettings(next)
    set({ settings: next })
  },

  startReview: (type, date) => {
    const id = `${type}-${date}`
    const existing = get().reviews.find((r) => r.id === id)
    if (existing) return existing

    const questions = QUESTIONS[type]
    const review: Review = {
      id,
      type,
      date,
      completedAt: null,
      isDraft: true,
      answers: questions.map((q) => ({ questionId: q.id, text: '' })),
    }

    set((state) => ({ reviews: [...state.reviews, review] }))
    upsertReview(review) // fire and forget
    return review
  },

  updateAnswer: (reviewId, questionId, text) => {
    // Update local state immediately so the UI is always snappy.
    set((state) => ({
      reviews: state.reviews.map((r) => {
        if (r.id !== reviewId) return r
        const answers = r.answers.map((a) =>
          a.questionId === questionId ? { ...a, text } : a
        )
        return { ...r, answers }
      }),
    }))

    // Debounce the actual DB write. If the user is still typing we keep
    // pushing the save back. When the timer finally fires we read the
    // *current* store state so we always persist the latest content —
    // never an intermediate snapshot from a stale closure.
    const existing = saveTimers.get(reviewId)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      saveTimers.delete(reviewId)
      const review = get().reviews.find((r) => r.id === reviewId)
      if (review) {
        upsertReview(review) // fire and forget — do not block typing on a server round-trip
      }
    }, 600)

    saveTimers.set(reviewId, timer)
  },

  completeReview: async (reviewId) => {
    const review = get().reviews.find((r) => r.id === reviewId)
    if (!review) return null

    const completed: Review = {
      ...review,
      isDraft: false,
      completedAt: new Date().toISOString(),
    }

    await upsertReview(completed)

    set((state) => {
      const nextCompleted = new Set(state.completedIds)
      nextCompleted.add(reviewId)
      return {
        reviews: state.reviews.map((r) => (r.id === reviewId ? completed : r)),
        completedIds: nextCompleted,
      }
    })

    writeCache(get().completedIds, get().settings)
    return completed
  },

  deleteReview: async (reviewId) => {
    await deleteReviewAction(reviewId)
    set((state) => {
      const nextCompleted = new Set(state.completedIds)
      nextCompleted.delete(reviewId)
      return {
        reviews: state.reviews.filter((r) => r.id !== reviewId),
        completedIds: nextCompleted,
      }
    })
    writeCache(get().completedIds, get().settings)
  },

  getReview: (id) => get().reviews.find((r) => r.id === id),

  getTodaysDue: () => {
    const { settings, completedIds } = get()
    const today = toISODate(new Date())
    return getReviewsDueToday(today, settings, completedIds)
  },
}))
