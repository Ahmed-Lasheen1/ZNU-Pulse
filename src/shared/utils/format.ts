// Number plus noun with a simple "s" plural, e.g. "3 lessons".
export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

// "N question(s)" label used on quiz cards.
export const countLabel = (n: number) => plural(n, 'question')

// Escapes LIKE wildcards so a typed % or _ is matched literally.
export function escapeLikePattern(value: string) {
  return value.replace(/[%_\\]/g, '\\$&')
}

// "Oct 22, 2026" in the visitor's locale; empty for invalid dates.
export function formatDate(value: string | number | Date) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
