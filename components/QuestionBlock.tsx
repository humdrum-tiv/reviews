'use client'

import { useRef, useEffect } from 'react'

interface QuestionBlockProps {
  index: number
  total: number
  questionText: string
  answer: string
  onChange: (text: string) => void
  isFocused?: boolean
  questionType?: 'text' | 'rating'
  readOnly?: boolean
}

export default function QuestionBlock({
  index,
  total,
  questionText,
  answer,
  onChange,
  isFocused,
  questionType = 'text',
  readOnly = false,
}: QuestionBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`
  }, [answer])

  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isFocused])

  return (
    <div className="question-block">
      {/* Stone slab top: question number + text */}
      <div className="question-slab">
        <span className="question-counter">
          {index + 1} / {total}
        </span>
        <p className="question-text">{questionText}</p>
      </div>

      {/* Inset writing area */}
      <div className="answer-well">
        {questionType === 'rating' ? (
          <div className="rating-row">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`rating-btn ${answer === String(n) ? 'rating-btn--active' : ''}`}
                onClick={() => !readOnly && onChange(String(n))}
                disabled={readOnly}
              >
                {n}
              </button>
            ))}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => onChange(e.target.value)}
            className="answer-textarea"
            placeholder={readOnly ? '' : 'Write your answer here…'}
            rows={5}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  )
}
