import { supabase } from '../supabase'

// Vercel rejects request bodies over ~4.5 MB and base64 adds ~33%, so raw files must stay near 3 MB.
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024

// Base64 without the data: prefix, as GitHub's Contents API expects.
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
  moduleName: string
  subjectId?: string | null
  subjectName?: string | null
  lessonId?: string | null
  examStage?: string | null
}

export interface PublishSummaryResult {
  success: boolean
  url: string
  summary?: unknown
}

// Uploads the HTML (+ images) to /api/admin/publish-summary, which commits them
// to the summaries repo and saves the public URL in the `summaries` table.
export async function publishSummary(params: PublishSummaryParams): Promise<PublishSummaryResult> {
  const { title, htmlFile, imageFiles, moduleId, moduleName, subjectId, subjectName, lessonId, examStage } = params

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
      module_name: moduleName,
      subject_id: subjectId || null,
      subject_name: subjectName || null,
      lesson_id: lessonId || null,
      exam_stage: examStage || null,
    }),
  })

  const result = await res.json().catch(() => ({} as { error?: string; url?: string }))
  if (!res.ok) {
    throw new Error(
      result.error ||
      (res.status === 413 ? 'Files are too large — keep the total under ~3 MB' : `Failed to publish summary (${res.status})`)
    )
  }
  return result as PublishSummaryResult
}
