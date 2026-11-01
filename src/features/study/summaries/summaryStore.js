import { idbGet, idbSet, idbDelete } from '@/core/idb'

const KEY_PREFIX = 'summary:'
const INDEX_KEY = 'summary-index'
const MAX_SAVED = 30
const FORMAT = 3

// Shared lesson files (CSS and JS) are saved inside each offline copy.
// CSS_IMPORT finds the import lines in shared/znu-pulse.css.
// SCRIPT_LIST finds the file list in shared/znu-pulse.js.
const CSS_IMPORT = /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?\s*;/g
const SCRIPT_LIST = /ZNU_PULSE_FILES\s*=\s*\[([^\]]*)\]/
const MAX_CSS_DEPTH = 3

function canSaveOffline(url) {
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === 'https:' && hostname.endsWith('.github.io')
  } catch {
    return false
  }
}

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function hashText(text) {
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

async function inlineImages(doc, baseUrl) {
  await Promise.all([...doc.querySelectorAll('img[src]')].map(async img => {
    const src = img.getAttribute('src')
    if (src.startsWith('data:')) return
    const imageUrl = new URL(src, baseUrl)
    if (imageUrl.origin !== baseUrl.origin) return
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error(`Image failed to load: ${src}`)
    img.setAttribute('src', await readAsDataUrl(await response.blob()))
    img.removeAttribute('srcset')
  }))
}

// no-cache: GitHub Pages sends a 10-minute max-age, so a plain fetch could
// save old files under a newer version number.
async function fetchText(url) {
  const response = await fetch(url, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`Shared file failed to load: ${url}`)
  return response.text()
}

// The shared folder sits next to the summaries folder in the lesson repo.
function sharedVersionUrl(lessonUrl) {
  const { origin, pathname } = new URL(lessonUrl)
  const cut = pathname.indexOf('/summaries/')
  return cut === -1 ? null : `${origin}${pathname.slice(0, cut)}/shared/version.txt`
}

async function fetchSharedVersion(lessonUrl) {
  const versionUrl = sharedVersionUrl(lessonUrl)
  if (!versionUrl) throw new Error('Shared folder not found for this lesson')
  const response = await fetch(versionUrl, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Shared version failed to load (${response.status})`)
  const version = (await response.text()).trim()
  if (!version) throw new Error('Shared version is empty')
  return version
}

// Returns the stylesheet text with every @import line replaced by that file's text.
async function expandCss(cssUrl, depth = 0) {
  if (depth > MAX_CSS_DEPTH) throw new Error('Shared CSS is nested too deeply')
  const css = await fetchText(cssUrl)
  const parts = []
  let last = 0
  for (const match of css.matchAll(CSS_IMPORT)) {
    parts.push(css.slice(last, match.index))
    parts.push(await expandCss(new URL(match[1], cssUrl).href, depth + 1))
    last = match.index + match[0].length
  }
  parts.push(css.slice(last))
  return parts.join('')
}

// Returns the script text. If it is the shared entry file, returns the listed files joined instead.
async function expandScript(scriptUrl) {
  const code = await fetchText(scriptUrl)
  const match = code.match(SCRIPT_LIST)
  if (!match) return code
  const names = [...match[1].matchAll(/["']([^"']+)["']/g)].map(item => item[1])
  if (!names.length) throw new Error('Shared script list is empty')
  const codes = await Promise.all(names.map(name => fetchText(new URL(name, scriptUrl).href)))
  return codes.join('\n;\n')
}

function isSameOrigin(href, baseUrl) {
  try {
    return new URL(href, baseUrl).origin === baseUrl.origin
  } catch {
    return false
  }
}

// Replaces same-origin stylesheet and script links with their contents.
// Returns the shared version, or null when the lesson does not use shared files.
async function inlineShared(doc, baseUrl, lessonUrl) {
  const links = [...doc.querySelectorAll('link[rel~="stylesheet"][href]')]
    .filter(link => isSameOrigin(link.getAttribute('href'), baseUrl))
  const scripts = [...doc.querySelectorAll('script[src]')]
    .filter(script => isSameOrigin(script.getAttribute('src'), baseUrl))
  if (!links.length && !scripts.length) return null

  const version = await fetchSharedVersion(lessonUrl)

  await Promise.all([
    ...links.map(async link => {
      const css = await expandCss(new URL(link.getAttribute('href'), baseUrl).href)
      const style = doc.createElement('style')
      style.textContent = css
      link.replaceWith(style)
    }),
    ...scripts.map(async script => {
      const code = await expandScript(new URL(script.getAttribute('src'), baseUrl).href)
      const inline = doc.createElement('script')
      inline.textContent = code.replace(/<\/script/gi, '<\\/script')
      script.replaceWith(inline)
    }),
  ])

  return version
}

async function trackSavedSummary(url) {
  const index = ((await idbGet(INDEX_KEY)) ?? []).filter(saved => saved !== url)
  index.push(url)
  const evicted = index.splice(0, Math.max(0, index.length - MAX_SAVED))
  await Promise.all([idbSet(INDEX_KEY, index), ...evicted.map(old => idbDelete(KEY_PREFIX + old))])
}

async function saveSummary(url) {
  const baseUrl = new URL(url)
  const response = await fetch(url, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`Summary failed to load (${response.status})`)
  const source = await response.text()
  const htmlHash = await hashText(source)
  const doc = new DOMParser().parseFromString(source, 'text/html')
  const sharedVersion = await inlineShared(doc, baseUrl, url)
  await inlineImages(doc, baseUrl)
  const html = `<!DOCTYPE html>${doc.documentElement.outerHTML}`
  await idbSet(KEY_PREFIX + url, { html, savedAt: Date.now(), sharedVersion, htmlHash, format: FORMAT })
  await trackSavedSummary(url)
  return html
}

async function fetchLessonHash(url) {
  try {
    const response = await fetch(url, { cache: 'no-cache' })
    if (!response.ok) return null
    return await hashText(await response.text())
  } catch {
    return null
  }
}

// A saved copy is outdated when it was saved by an older version of this code,
// when the lesson's own HTML has changed, or when it was saved with shared files
// and the shared version number has changed since.
// Any problem running a check counts as "not outdated", so the saved copy is kept.
async function isOutdated(url, saved) {
  if (saved.format !== FORMAT) return true

  if (saved.htmlHash) {
    const current = await fetchLessonHash(url)
    if (current && current !== saved.htmlHash) return true
  }

  if (!saved.sharedVersion) return false
  try {
    return (await fetchSharedVersion(url)) !== saved.sharedVersion
  } catch {
    return false
  }
}

export async function prepareOfflineSummary(url) {
  if (!canSaveOffline(url)) return null
  const saved = await idbGet(KEY_PREFIX + url)
  if (!navigator.onLine) return saved ? saved.html : null
  if (saved && !(await isOutdated(url, saved))) return saved.html
  try {
    return await saveSummary(url)
  } catch {
    return saved ? saved.html : null
  }
}
