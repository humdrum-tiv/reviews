import type { Review, ReviewType } from '@/types'
import { REVIEW_LABELS } from '@/types'
import { QUESTIONS } from './questions'
import { formatDateLong } from './schedule'
import { getObsidianHandle } from './storage'

/**
 * Generate Obsidian-compatible markdown for a review.
 */
export function generateMarkdown(review: Review): string {
  const questions = QUESTIONS[review.type]
  const questionMap = Object.fromEntries(questions.map((q) => [q.id, q.text]))

  const frontmatter = [
    '---',
    `date: ${review.date}`,
    `type: ${review.type}`,
    `tags: [review, ${review.type}]`,
    '---',
  ].join('\n')

  const title = `# ${REVIEW_LABELS[review.type]} — ${formatDateLong(review.date)}`

  const body = review.answers
    .filter((a) => a.text.trim())
    .map((a) => {
      const question = questionMap[a.questionId] ?? a.questionId
      return `## ${question}\n${a.text}`
    })
    .join('\n\n')

  return [frontmatter, '', title, '', body].join('\n')
}

/**
 * Trigger a browser download of the review as a .md file.
 */
export function downloadMarkdown(review: Review): void {
  const md = generateMarkdown(review)
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = getFilename(review)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Save a review to the user's configured Obsidian folder using File System Access API.
 * Returns true if successful.
 */
export async function saveToObsidian(review: Review): Promise<boolean> {
  try {
    const rootHandle = await getObsidianHandle()
    if (!rootHandle) return false

    // Verify permission (cast to any since TypeScript DOM types lag behind the spec)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAny = rootHandle as any
    const permission = await handleAny.queryPermission({ mode: 'readwrite' })
    if (permission !== 'granted') {
      const request = await handleAny.requestPermission({ mode: 'readwrite' })
      if (request !== 'granted') return false
    }

    // Create folder structure: Reviews/{type}/{year}/
    const year = review.date.split('-')[0]
    const reviewsDir = await rootHandle.getDirectoryHandle('Reviews', { create: true })
    const typeDir = await reviewsDir.getDirectoryHandle(capitalize(review.type), { create: true })
    const yearDir = await typeDir.getDirectoryHandle(year, { create: true })

    const filename = getFilename(review)
    const fileHandle = await yearDir.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(generateMarkdown(review))
    await writable.close()

    return true
  } catch {
    return false
  }
}

/**
 * Prompt the user to pick an Obsidian vault folder and store the handle.
 */
export async function pickObsidianFolder(): Promise<{ handle: FileSystemDirectoryHandle; path: string } | null> {
  try {
    // @ts-expect-error - showDirectoryPicker is not in TypeScript DOM types yet
    const handle: FileSystemDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
    return { handle, path: handle.name }
  } catch {
    return null
  }
}

function getFilename(review: Review): string {
  return `${review.date}-${review.type}-review.md`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Export all reviews of a given type as a zip or just download them one by one.
 * For simplicity, we download each as individual files.
 */
export function downloadAllReviews(reviews: Review[]): void {
  reviews.forEach((r, i) => {
    // Stagger downloads slightly to avoid browser blocking
    setTimeout(() => downloadMarkdown(r), i * 100)
  })
}

/**
 * Export multiple reviews as a single concatenated markdown file.
 */
export function downloadReviewsBundle(reviews: Review[], label: string): void {
  const sorted = [...reviews].sort((a, b) => a.date.localeCompare(b.date))
  const content = sorted.map(generateMarkdown).join('\n\n---\n\n')
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${label.toLowerCase().replace(/\s+/g, '-')}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
