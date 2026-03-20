'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useReviewStore } from '@/store/reviewStore'
import { toISODate, formatDateLong, getScheduledReviewType } from '@/lib/schedule'
import { REVIEW_LABELS, REVIEW_COLORS } from '@/types'
import type { ReviewType } from '@/types'

export default function TodayDashboard() {
  const { loadAll, isLoaded, getTodaysDue, reviews, completedIds, settings } = useReviewStore()

  useEffect(() => {
    loadAll()
  }, [loadAll])

  if (!isLoaded) {
    return (
      <div className="loading-state">
        <p>Loading…</p>
      </div>
    )
  }

  const today = toISODate(new Date())
  const due = getTodaysDue()
  const scheduled = getScheduledReviewType(today, settings)

  const todaysCompleted = reviews.filter(
    (r) => r.date === today && !r.isDraft
  )

  return (
    <div className="today-layout">
      <div className="today-header">
        <p className="today-label">today</p>
        <h1 className="today-date">{formatDateLong(today)}</h1>
      </div>

      {scheduled === 'rest' ? (
        <div className="rest-day-card">
          <p className="rest-day-title">Rest Day</p>
          <p className="rest-day-body">No reviews scheduled today. Enjoy your rest.</p>
        </div>
      ) : due.length === 0 && todaysCompleted.length > 0 ? (
        <div className="all-done-card">
          <p className="all-done-title">All done for today</p>
          <p className="all-done-body">
            {todaysCompleted.map((r) => REVIEW_LABELS[r.type]).join(' and ')} completed.
          </p>
        </div>
      ) : due.length === 0 ? (
        <div className="all-done-card">
          <p className="all-done-title">Nothing due today</p>
        </div>
      ) : (
        <div className="review-cards">
          {due.map((type) => (
            <ReviewCard
              key={type}
              type={type}
              date={today}
              isCompleted={completedIds.has(`${type}-${today}`)}
              isDraft={reviews.some((r) => r.id === `${type}-${today}` && r.isDraft)}
            />
          ))}
        </div>
      )}

      {/* Recent completions */}
      {todaysCompleted.length > 0 && due.length > 0 && (
        <div className="completed-today">
          <p className="section-label">completed today</p>
          <div className="completed-list">
            {todaysCompleted.map((r) => (
              <Link key={r.id} href={`/review/${r.type}?date=${r.date}`} className="completed-chip">
                {REVIEW_LABELS[r.type]}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewCard({
  type,
  date,
  isCompleted,
  isDraft,
}: {
  type: ReviewType
  date: string
  isCompleted: boolean
  isDraft: boolean
}) {
  const color = REVIEW_COLORS[type]
  const questionCounts: Record<ReviewType, number> = {
    morning: 6,
    evening: 6,
    weekly: 12,
    monthly: 18,
    quarterly: 24,
    annual: 40,
  }

  return (
    <Link href={`/review/${type}?date=${date}`} className="review-card">
      <div className="review-card-accent" style={{ backgroundColor: color }} />
      <div className="review-card-body">
        <h2 className="review-card-title">{REVIEW_LABELS[type]}</h2>
        <p className="review-card-meta">
          {questionCounts[type]} questions
          {isDraft && !isCompleted && ' · in progress'}
        </p>
      </div>
      <div className="review-card-arrow">→</div>
    </Link>
  )
}
