import { supabase } from '../supabase'

// Reads a File as base64 (no data: prefix) — the shape GitHub's
// Contents API expects for file content.
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] || '')
    }
    reader.onerror = () => reject(new Error(`Could not read file: ${file.name}`))
    reader.readAsDataURL(file)
  })
}

export interface PublishSummaryParams {
  title: string
  htmlFile: File
  imageFiles: File[]
  moduleId: string
  subjectId?: string | null
  lessonId?: string | null
  examStage?: string | null
}

export interface PublishSummaryResult {
  success: boolean
  url: string
  summary?: unknown
}

// Uploads the HTML file (+ any images) to /api/admin/publish-summary,
// which commits them to the dedicated summaries GitHub repo, gets a
// public jsdelivr URL, and saves that URL into the `summaries` table
// — the exact same row shape SummariesTab's existing "paste a link"
// flow already produces, so nothing downstream (SummaryOverlay, the
// student-facing Summary button) needs to know the difference.
export async function publishSummary(params: PublishSummaryParams): Promise<PublishSummaryResult> {
  const { title, htmlFile, imageFiles, moduleId, subjectId, lessonId, examStage } = params

  const [htmlContent, ...imageContents] = await Promise.all([
    readFileAsBase64(htmlFile),
    ...imageFiles.map(readFileAsBase64),
  ])

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const res = await fetch('/api/admin/publish-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({
      title,
      html: { name: htmlFile.name, content: htmlContent },
      images: imageFiles.map((f, i) => ({ name: f.name, content: imageContents[i] })),
      module_id: moduleId,
      subject_id: subjectId || null,
      lesson_id: lessonId || null,
      exam_stage: examStage || null,
    }),
  })

  const result = await res.json()
  if (!res.ok) throw new Error(result.error || 'Failed to publish summary')
  return result
}
