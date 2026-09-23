import type { CSSProperties } from 'react'
import { isArabicText } from '../lib/bidi'

interface AutoDirTextProps {
  text: string
  style?: CSSProperties
  wrapperStyle?: CSSProperties
}

// Per-line dir="auto" + Arabic type tuning only on Arabic lines.
export default function AutoDirText({ text, style, wrapperStyle }: AutoDirTextProps) {
  return (
    <div style={wrapperStyle}>
      {text.split('\n').map((line, i) => {
        const arabic = isArabicText(line)
        return (
          <div key={i} dir="auto" style={{
            ...style,
            fontFamily: arabic ? "'Cairo', 'Sora', sans-serif" : style?.fontFamily,
            lineHeight: arabic ? 1.8 : style?.lineHeight,
            letterSpacing: arabic ? 'normal' : style?.letterSpacing,
          }}>
            {line || '\u00A0'}
          </div>
        )
      })}
    </div>
  )
}
