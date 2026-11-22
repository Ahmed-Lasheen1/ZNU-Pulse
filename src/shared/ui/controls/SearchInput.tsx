import type { CSSProperties, KeyboardEvent, RefObject } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import { glassInput } from '@/shared/ui/glass/PulseUI'
import { SearchIcon2 } from '@/shared/icons/tool-icons'

interface SearchInputProps {
  dark: boolean
  value: string
  onChange: (value: string) => void
  placeholder?: string
  // Accessible name; defaults to the placeholder.
  ariaLabel?: string
  inputRef?: RefObject<HTMLInputElement>
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  // Distance of the magnifier icon from the left edge; pill-shaped fields need more.
  iconLeft?: number
  // Merged over the glass input style. Use padding longhands (paddingLeft, paddingRight...) to change padding.
  style?: CSSProperties
  wrapperStyle?: CSSProperties
}

// Glass search field with a leading magnifier icon.
export default function SearchInput({
  dark, value, onChange, placeholder = 'Search...', ariaLabel, inputRef, onKeyDown, iconLeft = 12, style, wrapperStyle,
}: SearchInputProps) {
  const pt = getPulseTheme(dark)

  return (
    <div style={{ position: 'relative', ...wrapperStyle }}>
      <span aria-hidden style={{ position: 'absolute', left: iconLeft, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'inline-flex' }}>
        <SearchIcon2 color={pt.faint} size={14} />
      </span>
      <input
        ref={inputRef}
        type="search"
        aria-label={ariaLabel ?? placeholder}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        style={{ ...glassInput(pt, dark), marginBottom: 0, paddingLeft: 34, ...style }}
      />
    </div>
  )
}
