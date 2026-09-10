// Converts common share links (Google Drive, YouTube) into embeddable
// iframe src URLs. Falls back to the original URL for anything else, or
// if parsing fails on a malformed value — a bad admin-entered URL
// should never crash the page; the iframe itself can show its own
// "can't load" state instead.
//
// Previously this logic was copy-pasted in Schedule.jsx (getPreviewUrl)
// and FilesPage.jsx (getPreviewUrl + getEmbedUrl) — now it lives here
// once. Behavior is unchanged.
//
// AUDIT FIX: added isSafeUrl() — every value returned by the two exported
// functions below now passes through it first. Previously an admin-entered
// (or, if an RLS gap ever let a non-admin write to `files`/`schedules`/
// `summaries`, an attacker-entered) value that wasn't a recognized Drive/
// YouTube link was returned completely unvalidated and then used directly
// as an <iframe src>, <audio src>, or window.open() target elsewhere in the
// app. Restricting to http(s) only is a cheap, zero-risk defense-in-depth
// measure — every legitimate use of these functions is already an http(s)
// link, so nothing that worked before is affected.

function isSafeUrl(url) {
  if (!url) return false
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function driveEmbedUrl(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null
}

// Drive link -> embeddable preview URL; anything else passes through
// unchanged (as long as it's http/https). Used for PDFs and schedule
// images.
export function getDriveOrRawUrl(url) {
  if (!url) return ''
  if (!isSafeUrl(url)) return ''
  try {
    if (url.includes('drive.google.com')) {
      return driveEmbedUrl(url) || url
    }
    return url
  } catch {
    return url
  }
}

// YouTube or Drive link -> embeddable video URL; anything else passes
// through unchanged (as long as it's http/https). Used for lecture
// recordings.
export function getVideoEmbedUrl(url) {
  if (!url) return ''
  if (!isSafeUrl(url)) return ''
  try {
    if (url.includes('youtube.com/watch')) {
      const id = new URL(url).searchParams.get('v')
      return `https://www.youtube.com/embed/${id}`
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1].split('?')[0]
      return `https://www.youtube.com/embed/${id}`
    }
    if (url.includes('drive.google.com')) {
      return driveEmbedUrl(url) || url
    }
    return url
  } catch {
    return url
  }
}

// Exported so call sites that use a raw URL directly (e.g. the "University
// Google Drive" button's window.open(driveUrl, ...) in ModulePage.tsx/
// StagePage.tsx) can validate before opening it, not just before embedding
// it in an iframe/audio tag.
export function isSafeExternalUrl(url) {
  return isSafeUrl(url)
}

// ... existing isSafeUrl, driveEmbedUrl, getDriveOrRawUrl, getVideoEmbedUrl, isSafeExternalUrl stay unchanged ...

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i
const HTML_EXT_RE = /\.html?(\?.*)?$/i

function isYouTubeUrl(url) {
  return url.includes('youtube.com/watch') || url.includes('youtu.be/')
}

// Classifies a URL (optionally with an explicit hint, e.g. a stored
// file_type column) into how SummaryOverlay should render it.
// 'image' -> <img>, 'video' -> embedded video iframe, 'iframe' ->
// everything else (PDF, HTML, Drive docs, etc) via a plain iframe.
export function previewKindFor(url, fileTypeHint) {
  if (fileTypeHint === 'video') return 'video'
  if (fileTypeHint === 'image') return 'image'
  if (fileTypeHint === 'pdf' || fileTypeHint === 'html') return 'iframe'
  if (!url) return 'iframe'
  if (isYouTubeUrl(url)) return 'video'
  if (IMAGE_EXT_RE.test(url)) return 'image'
  return 'iframe'
}

// Single entry point SummaryOverlay uses: resolves a raw admin-entered
// URL (Drive share link, YouTube link, direct image link, direct HTML
// link, whatever) into whatever `src` value actually works for the
// kind previewKindFor() decided on. Falls back to '' (renders nothing)
// for anything unsafe — same http(s)-only rule as every other embed
// helper here.
export function getPreviewUrl(url, fileTypeHint) {
  if (!url || !isSafeUrl(url)) return ''
  const kind = previewKindFor(url, fileTypeHint)
  if (kind === 'video') return getVideoEmbedUrl(url)
  if (kind === 'image') return url
  // 'iframe' catch-all: Drive links still get rewritten to their
  // /preview form; direct HTML/PDF/anything-else links pass through
  // unchanged, same as getDriveOrRawUrl already does.
  return getDriveOrRawUrl(url)
}
