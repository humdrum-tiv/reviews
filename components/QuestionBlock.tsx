'use client'

import { useRef, useEffect } from 'react'

interface QuestionBlockProps {
  index: number
  total: number
  questionText: string
  answer: string
  onChange: (text: string) => void
  isFocused?: boolean
}

export default function QuestionBlock({
  index,
  total,
  questionText,
  answer,
  onChange,
  isFocused,
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
        <textarea
          ref={textareaRef}
          value={answer}
          onChange={(e) => onChange(e.target.value)}
          className="answer-textarea"
          placeholder="Write your answer here…"
          rows={5}
        />
      </div>
    </div>
  )
}
