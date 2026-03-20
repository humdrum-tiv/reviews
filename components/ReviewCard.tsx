'use client'

import Link from 'next/link'
import type { Review } from '@/types'
import { REVIEW_LABELS, REVIEW_COLORS } from '@/types'
import { formatDateLong } from '@/lib/schedule'
import { downloadMarkdown } from '@/lib/export'

interface ReviewCardProps {
  review: Review
  showType?: boolean
}

export default function ReviewCard({ review, showType = true }: ReviewCardProps) {
  const color = REVIEW_COLORS[review.type]
  const firstAnswer = review.answers.find((a) => a.text.trim())
  const answerCount = review.answers.filter((a) => a.text.trim()).length

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    downloadMarkdown(review)
  }

  return (
    <div className="archive-card">
      <div className="archive-card-accent" style={{ backgroundColor: color }} />
      <div className="archive-card-body">
        <div className="archive-card-header">
          <div>
            {showType && (
              <span className="archive-type-label">{REVIEW_LABELS[review.type]}</span>
            )}
            <p className="archive-date">{formatDateLong(review.date)}</p>
          </div>
          <button
            onClick={handleDownload}
            className="archive-export-btn"
            title="Export as markdown"
          >
            .md
          </button>
        </div>

        {firstAnswer && (
          <p className="archive-preview">{firstAnswer.text.slice(0, 120)}{firstAnswer.text.length > 120 ? '…' : ''}</p>
        )}

        <Link href={`/review/${review.type}?date=${review.date}`} className="archive-read-link">
          Read →
        </Link>
      </div>
    </div>
  )
}
