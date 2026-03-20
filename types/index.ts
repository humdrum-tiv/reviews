export type ReviewType = 'morning' | 'evening' | 'weekly' | 'monthly' | 'quarterly' | 'annual'

export interface Question {
  id: string
  text: string
  type?: 'text' | 'rating' // default text
}

export interface Answer {
  questionId: string
  text: string
}

export interface Review {
  id: string // e.g. "morning-2026-03-20"
  type: ReviewType
  date: string // ISO date "YYYY-MM-DD"
  completedAt: string | null // ISO datetime, null if draft
  answers: Answer[]
  isDraft: boolean
}

export interface Settings {
  restDay: number | null // 0=Sun, 1=Mon ... 6=Sat, null=no rest day
  weeklyReviewDay: number // 0=Sun default
  morningTime: string // "07:00"
  eveningTime: string // "21:00"
  notificationsEnabled: boolean
  obsidianFolderPath: string | null // display only, actual handle stored separately
}

export const DEFAULT_SETTINGS: Settings = {
  restDay: null,
  weeklyReviewDay: 0, // Sunday
  morningTime: '07:00',
  eveningTime: '21:00',
  notificationsEnabled: false,
  obsidianFolderPath: null,
}

export const REVIEW_LABELS: Record<ReviewType, string> = {
  morning: 'Morning Review',
  evening: 'Evening Review',
  weekly: 'Weekly Review',
  monthly: 'Monthly Review',
  quarterly: 'Quarterly Review',
  annual: 'Annual Review',
}

export const REVIEW_COLORS: Record<ReviewType, string> = {
  morning: '#C9A96E',
  evening: '#7B8FA1',
  weekly: '#8B7355',
  monthly: '#6B8F71',
  quarterly: '#7B6E8B',
  annual: '#8B5E5E',
}
