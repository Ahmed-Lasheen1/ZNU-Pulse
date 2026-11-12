import type { ReactNode } from 'react'
import { pulseType, ON_BACKGROUND } from '@/shared/theme/premiumTheme'

interface PageIntroProps {
  dark: boolean
  emoji: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  paddingBottom?: number
}

// Shared "emoji + title + optional subtitle" header used at the top of
// Schedule, Checklist, FilesPage, AnonQuestions, Search, and Review.
// Sits directly on the flat page background (no glass surface), so it
// uses the ON_BACKGROUND text tokens, which follow the color mode.
export default function PageIntro({ dark, emoji, title, subtitle, paddingBottom = 24 }: PageIntroProps) {
  return (
    <div style={{ textAlign: 'center', padding: `10px 0 ${paddingBottom}px` }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>{emoji}</div>
      <h1 style={{ ...pulseType.miniPageTitle, color: ON_BACKGROUND.primary, marginBottom: 4 }}>{title}</h1>
      {subtitle && <p style={{ color: ON_BACKGROUND.muted, fontSize: 13 }}>{subtitle}</p>}
    </div>
  )
}
