import { createClient } from '@supabase/supabase-js'

// Same "read from environment, never hardcode" pattern as the other
// api/push/*.js functions in this project.
const SUPABASE_URL = process.env.SUPABASE_URL
const GITHUB_TOKEN = process.env.SUMMARIES_GITHUB_TOKEN
const GITHUB_OWNER = process.env.SUMMARIES_GITHUB_OWNER
const GITHUB_REPO = process.env.SUMMARIES_GITHUB_REPO
const GITHUB_BRANCH = process.env.SUMMARIES_GITHUB_BRANCH || 'main'

const ALLOWED_EXTENSIONS = ['html', 'htm', 'png', 'jpg', 'jpeg', 'svg', 'gif', 'webp']
const MAX_FILES = 30

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

async function githubPutFile(path, base64Content, message) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: base64Content,
      branch: GITHUB_BRANCH,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GitHub commit failed for ${path}: ${res.status} ${text}`)
  }
  return res.json()
}

// NOTE: jsdelivr was the original plan here, but jsdelivr deliberately
// serves .html files as `text/plain` (not `text/html`) as an anti-
// phishing/anti-XSS measure — a summary opened via jsdelivr shows raw
// source code instead of rendering. GitHub Pages serves the correct
// content-type for every file extension, so the public URL below is
// built from the repo's Pages URL instead. Requires GitHub Pages to
// be enabled on the repo (Settings → Pages → Deploy from branch →
// main → /root) and a `.nojekyll` file committed to the repo root
// (stops Jekyll processing from mangling folders/files, which isn't
// needed for a plain static-file repo like this one).
//
// GitHub Pages rebuilds asynchronously after a push — usually live
// within a minute, occasionally longer on the very first deploy after
// enabling Pages. A summary published moments ago may briefly 404
// until that rebuild finishes; there's nothing to poll for here since
// Pages doesn't expose a "build finished" webhook this function could
// wait on.
function buildPagesUrl(path) {
  return `https://${GITHUB_OWNER.toLowerCase()}.github.io/${GITHUB_REPO}/${path}`
}

// Publishes an admin-uploaded HTML summary (+ optional images) to the
// dedicated GitHub "summaries" repo, then saves the resulting public
// GitHub Pages URL into the existing `summaries` table — the exact same
// row shape as a manually-pasted-link summary, so the student-facing
// SummaryOverlay needs zero changes. Auth is verified server-side
// (mirrors api/push/broadcast.js): the caller must send a valid
// signed-in Supabase access token, and that user's profile must have
// role = 'admin'.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!SUPABASE_URL || !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error('[publish-summary] Missing required environment variables.')
    return res.status(500).json({ error: 'Server misconfiguration — missing environment variables' })
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return res.status(401).json({ error: 'Invalid session' })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single()
  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })

  const { title, html, images, module_id, subject_id, lesson_id, exam_stage } = req.body || {}

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

  const folderSlug = `${slugify(title)}-${Date.now().toString(36)}`
  const basePath = `summaries/${folderSlug}`

  try {
    await githubPutFile(`${basePath}/index.html`, html.content, `Publish summary: ${title}`)
    for (const img of imageList) {
      const safeName = img.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      await githubPutFile(`${basePath}/${safeName}`, img.content, `Add image for summary: ${title}`)
    }
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
    // Files are already live on GitHub even if this insert failed —
    // return the URL so the admin isn't left with orphaned files and
    // no way to know they published successfully.
    return res.status(500).json({
      error: 'Files were published but could not be saved to the database: ' + insertError.message,
      url: publicUrl,
    })
  }

  return res.status(200).json({ success: true, url: publicUrl, summary: inserted })
}
