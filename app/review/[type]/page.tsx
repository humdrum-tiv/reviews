import { notFound } from 'next/navigation'
import type { ReviewType } from '@/types'
import ReviewWriterClient from './ReviewWriterClient'

const VALID_TYPES: ReviewType[] = ['morning', 'evening', 'weekly', 'monthly', 'quarterly', 'annual']

interface PageProps {
  params: Promise<{ type: string }>
  searchParams: Promise<{ date?: string }>
}

export default async function ReviewPage({ params, searchParams }: PageProps) {
  const { type } = await params
  const { date } = await searchParams

  if (!VALID_TYPES.includes(type as ReviewType)) {
    notFound()
  }

  const reviewDate = date ?? new Date().toISOString().split('T')[0]

  return <ReviewWriterClient type={type as ReviewType} date={reviewDate} />
}
