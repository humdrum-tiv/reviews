import { create } from 'zustand'
import type { Review, Settings, ReviewType } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import {
  getAllReviews,
  saveReview,
  getAllSettings,
  setSetting,
  getCompletedReviewIds,
  saveObsidianHandle,
} from '@/lib/storage'
import { toISODate, getReviewsDueToday } from '@/lib/schedule'
import { QUESTIONS } from '@/lib/questions'

interface ReviewStore {
  reviews: Review[]
  settings: Settings
  completedIds: Set<string>
  isLoaded: boolean

  // Actions
  loadAll: () => Promise<void>
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
  setObsidianFolder: (handle: FileSystemDirectoryHandle, path: string) => Promise<void>

  startReview: (type: ReviewType, date: string) => Review
  updateAnswer: (reviewId: string, questionId: string, text: string) => Promise<void>
  completeReview: (reviewId: string) => Promise<Review | null>
  getReview: (id: string) => Review | undefined

  getTodaysDue: () => ReviewType[]
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  reviews: [],
  settings: DEFAULT_SETTINGS,
  completedIds: new Set(),
  isLoaded: false,

  loadAll: async () => {
    const [reviews, settings, completedIds] = await Promise.all([
      getAllReviews(),
      getAllSettings(),
      getCompletedReviewIds(),
    ])
    set({ reviews, settings, completedIds, isLoaded: true })
  },

  updateSetting: async (key, value) => {
    await setSetting(key, value)
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }))
  },

  setObsidianFolder: async (handle, path) => {
    await saveObsidianHandle(handle)
    await setSetting('obsidianFolderPath', path)
    set((state) => ({
      settings: { ...state.settings, obsidianFolderPath: path },
    }))
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
    saveReview(review) // fire and forget
    return review
  },

  updateAnswer: async (reviewId, questionId, text) => {
    set((state) => ({
      reviews: state.reviews.map((r) => {
        if (r.id !== reviewId) return r
        const answers = r.answers.map((a) =>
          a.questionId === questionId ? { ...a, text } : a
        )
        return { ...r, answers }
      }),
    }))

    const review = get().reviews.find((r) => r.id === reviewId)
    if (review) {
      await saveReview(review)
    }
  },

  completeReview: async (reviewId) => {
    const review = get().reviews.find((r) => r.id === reviewId)
    if (!review) return null

    const completed: Review = {
      ...review,
      isDraft: false,
      completedAt: new Date().toISOString(),
    }

    await saveReview(completed)

    set((state) => ({
      reviews: state.reviews.map((r) => (r.id === reviewId ? completed : r)),
      completedIds: new Set([...state.completedIds, reviewId]),
    }))

    return completed
  },

  getReview: (id) => get().reviews.find((r) => r.id === id),

  getTodaysDue: () => {
    const { settings, completedIds } = get()
    const today = toISODate(new Date())
    return getReviewsDueToday(today, settings, completedIds)
  },
}))
