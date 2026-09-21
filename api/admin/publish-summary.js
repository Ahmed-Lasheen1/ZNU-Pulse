import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GITHUB_TOKEN = process.env.SUMMARIES_GITHUB_TOKEN
const GITHUB_OWNER = process.env.SUMMARIES_GITHUB_OWNER
const GITHUB_REPO = process.env.SUMMARIES_GITHUB_REPO
const GITHUB_BRANCH = process.env.SUMMARIES_GITHUB_BRANCH || 'main'

const ALLOWED_EXTENSIONS = ['html', 'htm', 'png', 'jpg', 'jpeg', 'svg', 'gif', 'webp']
const MAX_FILES = 30
const UPLOAD_BATCH_SIZE = 3
const COMMIT_ATTEMPTS = 4

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'summary'
}

function extOf(filename) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(filename || '')
  return m ? m[1].toLowerCase() : ''
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Parallel commits to one branch can 409/422 — retry with backoff.
async function githubPutFile(path, base64Content, message) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`
  let lastError
  for (let attempt = 1; attempt <= COMMIT_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, content: base64Content, branch: GITHUB_BRANCH }),
    })
    if (res.ok) return res.json()

    const text = await res.text().catch(() => '')
    lastError = new Error(`GitHub commit failed for ${path}: ${res.status} ${text}`)
    const retryable = res.status === 409 || res.status === 422 || res.status >= 500
    if (!retryable || attempt === COMMIT_ATTEMPTS) break
    await sleep(400 * attempt + Math.random() * 300)
  }
  throw lastError
}

async function runInBatches(items, batchSize, fn) {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.all(items.slice(i, i + batchSize).map(fn))
  }
}

// jsdelivr serves .html as text/plain, so the public URL is the repo's GitHub Pages URL
// (Pages enabled on the repo, plus a .nojekyll file at its root). Pages rebuilds
// asynchronously — a just-published summary can 404 for a minute.
function buildPagesUrl(path) {
  return `https://${GITHUB_OWNER.toLowerCase()}.github.io/${GITHUB_REPO}/${path}`
}

// Admin-only: verifies the caller's Supabase token and profile role, commits the
// files to the summaries repo, then saves the URL in the `summaries` table.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error('[publish-summary] Missing required environment variables.')
    return res.status(500).json({ error: 'Server misconfiguration — missing environment variables' })
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return res.status(401).json({ error: 'Invalid session' })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single()
  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })

  const { title, html, images, module_id, subject_id, lesson_id, exam_stage, module_name, subject_name } = req.body || {}

  if (!title || !html?.content || !html?.name || !module_id) {
    return res.status(400).json({ error: 'title, an HTML file, and a module are required' })
  }
  if (extOf(html.name) !== 'html' && extOf(html.name) !== 'htm') {
    return res.status(400).json({ error: 'Summary file must be an .html file' })
  }

  const imageList = Array.isArray(images) ? images : []
  if (imageList.length > MAX_FILES) {
    return res.status(400).json({ error: `Too many files — max ${MAX_FILES} images per summary` })
  }
  for (const img of imageList) {
    if (!ALLOWED_EXTENSIONS.includes(extOf(img.name))) {
      return res.status(400).json({ error: `Unsupported file type: ${img.name}` })
    }
  }

  // Repo layout: summaries/<module>/<subject>/<title>-<id>/ (subject level skipped when none picked).
  const folderSlug = `${slugify(title)}-${Date.now().toString(36)}`
  const modulePart = slugify(module_name || module_id)
  const subjectPart = subject_name ? slugify(subject_name) : null
  const basePath = subjectPart
    ? `summaries/${modulePart}/${subjectPart}/${folderSlug}`
    : `summaries/${modulePart}/${folderSlug}`

  try {
    await githubPutFile(`${basePath}/index.html`, html.content, `Publish summary: ${title}`)
    await runInBatches(imageList, UPLOAD_BATCH_SIZE, async (img) => {
      const safeName = img.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      await githubPutFile(`${basePath}/${safeName}`, img.content, `Add image for summary: ${title}`)
    })
  } catch (err) {
    console.error('[publish-summary] GitHub commit failed:', err)
    return res.status(500).json({ error: 'Could not publish files to GitHub — ' + err.message })
  }

  const publicUrl = buildPagesUrl(`${basePath}/index.html`)

  const payload = {
    title,
    url: publicUrl,
    module_id,
    subject_id: subject_id || null,
    lesson_id: lesson_id || null,
    exam_stage: exam_stage || null,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('summaries')
    .insert([payload])
    .select()
    .single()

  if (insertError) {
    // Files are already live — return the URL so they aren't orphaned unnoticed.
    return res.status(500).json({
      error: 'Files were published but could not be saved to the database: ' + insertError.message,
      url: publicUrl,
    })
  }

  return res.status(200).json({ success: true, url: publicUrl, summary: inserted })
}
