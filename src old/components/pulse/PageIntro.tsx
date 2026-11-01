import type { ReactNode } from 'react'
import { pulseType, ON_GRADIENT_TOP } from '../../premiumTheme'

interface PageIntroProps {
  dark: boolean
  emoji: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  paddingBottom?: number
}

// Shared "emoji + title + optional subtitle" header used at the top of
// Schedule, Checklist, FilesPage, AnonQuestions, Search, and Review.
// Sits directly on the PULSE_BG gradient (no glass surface), always
// near the top (light zone) of the fixed gradient, so it uses the
// ON_GRADIENT_TOP tokens rather than the Liquid Glass text tokens.
export default function PageIntro({ dark, emoji, title, subtitle, paddingBottom = 24 }: PageIntroProps) {
  return (
    <div style={{ textAlign: 'center', padding: `10px 0 ${paddingBottom}px` }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>{emoji}</div>
      <h1 style={{ ...pulseType.miniPageTitle, color: ON_GRADIENT_TOP.primary, marginBottom: 4 }}>{title}</h1>
      {subtitle && <p style={{ color: ON_GRADIENT_TOP.muted, fontSize: 13 }}>{subtitle}</p>}
    </div>
  )
}
