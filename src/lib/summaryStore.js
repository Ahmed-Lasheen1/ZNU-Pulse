import { idbGet, idbSet, idbDelete } from './idb'

const KEY_PREFIX = 'summary:'
const INDEX_KEY = 'summary-index'
const MAX_SAVED = 30

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

async function trackSavedSummary(url) {
  const index = ((await idbGet(INDEX_KEY)) ?? []).filter(saved => saved !== url)
  index.push(url)
  const evicted = index.splice(0, Math.max(0, index.length - MAX_SAVED))
  await Promise.all([idbSet(INDEX_KEY, index), ...evicted.map(old => idbDelete(KEY_PREFIX + old))])
}

async function saveSummary(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Summary failed to load (${response.status})`)
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
  await inlineImages(doc, new URL(url))
  const html = `<!DOCTYPE html>${doc.documentElement.outerHTML}`
  await idbSet(KEY_PREFIX + url, { html, savedAt: Date.now() })
  await trackSavedSummary(url)
  return html
}

export async function prepareOfflineSummary(url) {
  if (!canSaveOffline(url)) return null
  const saved = await idbGet(KEY_PREFIX + url)
  if (saved) return saved.html
  if (!navigator.onLine) return null
  try {
    return await saveSummary(url)
  } catch {
    return null
  }
}
