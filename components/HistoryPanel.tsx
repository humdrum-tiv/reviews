'use client'

import { useMemo, useState } from 'react'
import { useReviewStore } from '@/store/reviewStore'
import type { Review, ReviewType } from '@/types'
import { REVIEW_LABELS } from '@/types'
import { getHistoryContext, getReviewPeriod, formatDateLong } from '@/lib/schedule'
import { QUESTIONS } from '@/lib/questions'

interface HistoryPanelProps {
  type: ReviewType
  date: string
  onClose: () => void
}

export default function HistoryPanel({ type, date, onClose }: HistoryPanelProps) {
  const { reviews } = useReviewStore()
  const [expanded, setExpanded] = useState<string | null>(null)

  const contextTypes = getHistoryContext(type)
  const period = getReviewPeriod(type, date)

  // Get relevant reviews: same type (all time) + sub-reviews within the period
  const relevant = useMemo(() => {
    return reviews
      .filter((r) => {
        if (r.isDraft) return false
        if (r.id === `${type}-${date}`) return false // current
        // Same type: all historical
        if (r.type === type) return r.date < date
        // Sub-reviews: within the period covered by current review
        if (contextTypes.includes(r.type) && r.type !== type) {
          return r.date >= period.start && r.date <= period.end
        }
        return false
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [reviews, type, date, contextTypes, period])

  return (
    <aside className="history-panel">
      <div className="history-panel-header">
        <h2 className="history-panel-title">Past Reviews</h2>
        <button onClick={onClose} className="panel-close-btn" aria-label="Close panel">
          ×
        </button>
      </div>

      {relevant.length === 0 ? (
        <p className="history-empty">No past reviews yet.</p>
      ) : (
        <div className="history-list">
          {relevant.map((r) => (
            <HistoryEntry
              key={r.id}
              review={r}
              isExpanded={expanded === r.id}
              onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
            />
          ))}
        </div>
      )}
    </aside>
  )
}

function HistoryEntry({
  review,
  isExpanded,
  onToggle,
}: {
  review: Review
  isExpanded: boolean
  onToggle: () => void
}) {
  const firstAnswer = review.answers.find((a) => a.text.trim())

  return (
    <div className="history-entry">
      <button className="history-entry-header" onClick={onToggle}>
        <div className="history-entry-meta">
          <span className="history-entry-type">{REVIEW_LABELS[review.type]}</span>
          <span className="history-entry-date">{formatDateLong(review.date)}</span>
        </div>
        <span className="history-entry-chevron">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="history-entry-body">
          <div className="history-entry-content">
            {review.answers
              .filter((a) => a.text.trim())
              .map((a) => (
                <div key={a.questionId} className="history-qa">
                  <p className="history-q">{getQuestionText(review.type, a.questionId)}</p>
                  <p className="history-a">{a.text}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getQuestionText(type: ReviewType, questionId: string): string {
  const q = QUESTIONS[type]?.find((q) => q.id === questionId)
  return q?.text ?? questionId
}
