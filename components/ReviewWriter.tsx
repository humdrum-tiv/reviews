'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useReviewStore } from '@/store/reviewStore'
import { QUESTIONS } from '@/lib/questions'
import { REVIEW_LABELS } from '@/types'
import type { ReviewType } from '@/types'
import { formatDateLong } from '@/lib/schedule'
import { downloadMarkdown, saveToObsidian } from '@/lib/export'
import QuestionBlock from './QuestionBlock'
import HistoryPanel from './HistoryPanel'

interface ReviewWriterProps {
  type: ReviewType
  date: string
}

export default function ReviewWriter({ type, date }: ReviewWriterProps) {
  const router = useRouter()
  const { startReview, updateAnswer, completeReview, getReview, settings } = useReviewStore()
  const [review, setReview] = useState(() => startReview(type, date))
  const [historyOpen, setHistoryOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const questions = QUESTIONS[type]

  // Keep local state in sync with store
  useEffect(() => {
    const current = getReview(`${type}-${date}`)
    if (current) setReview(current)
  }, [type, date, getReview])

  const handleChange = useCallback(
    (questionId: string, text: string) => {
      updateAnswer(review.id, questionId, text)
      setReview((r) => ({
        ...r,
        answers: r.answers.map((a) =>
          a.questionId === questionId ? { ...a, text } : a
        ),
      }))
    },
    [review.id, updateAnswer]
  )

  const handleComplete = async () => {
    setCompleting(true)
    const completed = await completeReview(review.id)
    if (!completed) { setCompleting(false); return }

    // Try to save to Obsidian if configured
    if (settings.obsidianFolderPath) {
      const saved = await saveToObsidian(completed)
      if (saved) setSaveMsg('Saved to Obsidian')
    }

    router.push('/')
  }

  const handleDownload = () => {
    downloadMarkdown(review)
  }

  const answeredCount = review.answers.filter((a) => a.text.trim()).length
  const progress = Math.round((answeredCount / questions.length) * 100)

  return (
    <div className="writer-layout">
      {/* Header */}
      <div className="writer-header">
        <div className="writer-header-left">
          <button onClick={() => router.push('/')} className="back-btn">
            ← back
          </button>
          <div>
            <h1 className="writer-title">{REVIEW_LABELS[type]}</h1>
            <p className="writer-date">{formatDateLong(date)}</p>
          </div>
        </div>
        <div className="writer-header-right">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="history-toggle-btn"
            title="View past reviews"
          >
            past reviews
          </button>
          <button onClick={handleDownload} className="export-btn" title="Download as markdown">
            export .md
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Main content */}
      <div className={`writer-body ${historyOpen ? 'writer-body--with-panel' : ''}`}>
        <div className="questions-column">
          {questions.map((q, i) => {
            const answer = review.answers.find((a) => a.questionId === q.id)?.text ?? ''
            return (
              <QuestionBlock
                key={q.id}
                index={i}
                total={questions.length}
                questionText={q.text}
                answer={answer}
                onChange={(text) => handleChange(q.id, text)}
              />
            )
          })}

          {/* Complete button */}
          <div className="complete-section">
            {saveMsg && <p className="save-msg">{saveMsg}</p>}
            <button
              onClick={handleComplete}
              disabled={completing}
              className="complete-btn"
            >
              {completing ? 'Saving…' : 'Complete Review'}
            </button>
          </div>
        </div>

        {/* History panel */}
        {historyOpen && (
          <HistoryPanel
            type={type}
            date={date}
            onClose={() => setHistoryOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
