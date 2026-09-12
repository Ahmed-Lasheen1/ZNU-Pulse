// Converts common share links (Google Drive, YouTube) into embeddable
// iframe src URLs. Falls back to the original URL for anything else,
// or on parse failure — a bad admin-entered URL should never crash
// the page.

// Every returned value passes through isSafeUrl first — restricts to
// http(s) so an unrecognized/malicious value never lands directly in
// an <iframe src>, <audio src>, or window.open() target.
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
// unchanged (if http/https). Used for PDFs and schedule images.
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
// through unchanged (if http/https). Used for lecture recordings.
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

// For call sites that open a raw URL directly (window.open), rather
// than embedding it in an iframe/audio tag.
export function isSafeExternalUrl(url) {
  return isSafeUrl(url)
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i
const HTML_EXT_RE = /\.html?(\?.*)?$/i

function isYouTubeUrl(url) {
  return url.includes('youtube.com/watch') || url.includes('youtu.be/')
}

// Classifies a URL (optionally with an explicit file_type hint) into
// how SummaryOverlay/MediaOverlay should render it: 'image' -> <img>,
// 'video' -> embedded video iframe, 'iframe' -> everything else.
export function previewKindFor(url, fileTypeHint) {
  if (fileTypeHint === 'video') return 'video'
  if (fileTypeHint === 'image') return 'image'
  if (fileTypeHint === 'pdf' || fileTypeHint === 'html') return 'iframe'
  if (!url) return 'iframe'
  if (isYouTubeUrl(url)) return 'video'
  if (IMAGE_EXT_RE.test(url)) return 'image'
  return 'iframe'
}

// Single entry point for resolving a raw admin-entered URL into
// whatever `src` actually works for previewKindFor's chosen kind.
// Falls back to '' for anything unsafe.
export function getPreviewUrl(url, fileTypeHint) {
  if (!url || !isSafeUrl(url)) return ''
  const kind = previewKindFor(url, fileTypeHint)
  if (kind === 'video') return getVideoEmbedUrl(url)
  if (kind === 'image') return url
  return getDriveOrRawUrl(url)
}
