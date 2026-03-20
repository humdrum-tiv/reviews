'use client'

import { useEffect, useState } from 'react'
import { useReviewStore } from '@/store/reviewStore'
import type { ReviewType } from '@/types'
import { REVIEW_LABELS, REVIEW_COLORS } from '@/types'
import ReviewCard from '@/components/ReviewCard'
import { downloadReviewsBundle } from '@/lib/export'

const ALL_TYPES: ReviewType[] = ['annual', 'quarterly', 'monthly', 'weekly', 'evening', 'morning']

export default function HistoryPage() {
  const { loadAll, isLoaded, reviews } = useReviewStore()
  const [filter, setFilter] = useState<ReviewType | 'all'>('all')

  useEffect(() => {
    if (!isLoaded) loadAll()
  }, [isLoaded, loadAll])

  const completed = reviews
    .filter((r) => !r.isDraft)
    .filter((r) => filter === 'all' || r.type === filter)
    .sort((a, b) => b.date.localeCompare(a.date))

  const handleBundleExport = () => {
    const toExport = filter === 'all' ? completed : completed.filter((r) => r.type === filter)
    if (toExport.length === 0) return
    const label = filter === 'all' ? 'all-reviews' : `${filter}-reviews`
    downloadReviewsBundle(toExport, label)
  }

  return (
    <div className="history-layout">
      <div className="history-page-header">
        <h1 className="page-title">Archive</h1>
        {completed.length > 0 && (
          <button onClick={handleBundleExport} className="export-btn">
            export {filter === 'all' ? 'all' : filter} .md
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'filter-tab--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {ALL_TYPES.map((type) => (
          <button
            key={type}
            className={`filter-tab ${filter === type ? 'filter-tab--active' : ''}`}
            onClick={() => setFilter(type)}
            style={filter === type ? { borderColor: REVIEW_COLORS[type] } : undefined}
          >
            {REVIEW_LABELS[type]}
          </button>
        ))}
      </div>

      {!isLoaded ? (
        <div className="loading-state"><p>Loading…</p></div>
      ) : completed.length === 0 ? (
        <div className="empty-state">
          <p>No completed reviews yet.</p>
          <p className="empty-state-sub">Complete your first review to see it here.</p>
        </div>
      ) : (
        <div className="archive-grid">
          {completed.map((review) => (
            <ReviewCard key={review.id} review={review} showType={filter === 'all'} />
          ))}
        </div>
      )}
    </div>
  )
}
