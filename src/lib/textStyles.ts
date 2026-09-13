import type { CSSProperties } from 'react'

// Lets long unbroken tokens (drug names, dosages, abbreviations with
// no spaces) wrap onto a new line instead of overflowing their card.
export const wrapText: CSSProperties = {
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  whiteSpace: 'normal',
}
