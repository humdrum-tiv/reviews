'use client'

import { useEffect } from 'react'
import { useReviewStore } from '@/store/reviewStore'
import type { ReviewType } from '@/types'
import ReviewWriter from '@/components/ReviewWriter'

interface Props {
  type: ReviewType
  date: string
}

export default function ReviewWriterClient({ type, date }: Props) {
  const { loadAll, isLoaded } = useReviewStore()

  useEffect(() => {
    if (!isLoaded) loadAll()
  }, [isLoaded, loadAll])

  if (!isLoaded) {
    return (
      <div className="loading-state">
        <p>Loading…</p>
      </div>
    )
  }

  return <ReviewWriter type={type} date={date} />
}
