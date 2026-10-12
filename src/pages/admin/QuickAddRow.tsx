import { useState, useRef, type ClipboardEvent } from 'react'
import { getPulseTheme } from '../../premiumTheme'
import { PlusIcon } from '../../components/ui/tool-icons'
import { miniBtn, inStyle as adminInStyle } from './adminStyles'

interface QuickAddRowProps {
  dark: boolean
  placeholder: string
  indent: number
  onAdd: (names: string[]) => Promise<boolean>
  onDetails: () => void
}

function splitNames(text: string) {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
}

export default function QuickAddRow({ dark, placeholder, indent, onAdd, onDetails }: QuickAddRowProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit(names: string[], clearInput: boolean) {
    if (names.length === 0 || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    const ok = await onAdd(names)
    busyRef.current = false
    setBusy(false)
    if (ok && clearInput) setValue('')
    inputRef.current?.focus()
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const names = splitNames(e.clipboardData.getData('text'))
    if (names.length < 2) return
    e.preventDefault()
    submit(names, false)
  }

  return (
    <div style={{ marginLeft: indent, display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={e => setValue(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={e => {
          if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
          e.preventDefault()
          submit(splitNames(value), true)
        }}
        style={{ ...inStyle, flex: 1, minWidth: 0, width: 'auto', marginBottom: 0, padding: '9px 16px', fontSize: 13 }}
      />
      <button
        type="button"
        onClick={() => submit(splitNames(value), true)}
        disabled={busy || !value.trim()}
        style={{ ...miniBtn(pt.cobalt), opacity: busy || !value.trim() ? 0.5 : 1 }}
      >
        <PlusIcon color={pt.cobalt} size={11} /> {busy ? '...' : 'Add'}
      </button>
      <button type="button" onClick={onDetails} style={miniBtn(pt.sub)}>Details</button>
    </div>
  )
}
