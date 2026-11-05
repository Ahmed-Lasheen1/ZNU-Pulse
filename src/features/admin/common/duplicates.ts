// Lowercases, trims and collapses whitespace so near-identical texts compare equal.
export function normalizeText(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

// True when the text matches any existing text after normalizing both.
export function isDuplicateText(text: string, existingTexts: string[]) {
  const key = normalizeText(text)
  return existingTexts.some(existing => normalizeText(existing) === key)
}

// Splits items into new ones and duplicates (of existing texts or of earlier items in the same batch).
export function splitDuplicates<T>(items: T[], textOf: (item: T) => string, existingTexts: string[]) {
  const seen = new Set(existingTexts.map(normalizeText))
  const fresh: T[] = []
  const duplicates: T[] = []
  items.forEach(item => {
    const key = normalizeText(textOf(item))
    if (seen.has(key)) {
      duplicates.push(item)
    } else {
      seen.add(key)
      fresh.push(item)
    }
  })
  return { fresh, duplicates }
}

// Short suffix for success messages, e.g. " 2 duplicates skipped."
export function skippedNote(count: number) {
  return count > 0 ? ` ${count} duplicate${count === 1 ? '' : 's'} skipped.` : ''
}
