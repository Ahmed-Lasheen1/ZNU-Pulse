import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { getPulseTheme, pulseFonts, ON_GRADIENT_TOP } from '@/shared/theme/premiumTheme'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'
import { glassHoverTint } from '@/shared/theme/liquidGlass'

interface StudyHeaderProps {
  dark: boolean
  eyebrow: string
  status?: string
  timer?: string
  fontScale?: number
  onCycleFontScale?: () => void
  onExit: () => void
}

// Glass pill used for the header's side buttons.
function TopButton({ dark, onClick, ariaLabel, children }: {
  dark: boolean; onClick: () => void; ariaLabel: string; children: ReactNode
}) {
  const pt = getPulseTheme(dark)
  return (
    <PulseGlassRow
      dark={dark} radius={999} hoverTint={glassHoverTint(dark)} onClick={onClick}
      role="button" tabIndex={0} aria-label={ariaLabel}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
    >
      <div className="study-top-btn" style={{
        height: 44, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        fontFamily: pulseFonts.body, fontSize: 14, fontWeight: 700, color: pt.sub, whiteSpace: 'nowrap',
      }}>{children}</div>
    </PulseGlassRow>
  )
}

// Header shared by the MCQ and flashcards study screens: text size, title and status, exit.
export default function StudyHeader({ dark, eyebrow, status, timer, fontScale = 1, onCycleFontScale, onExit }: StudyHeaderProps) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
      alignItems: 'center', columnGap: 8, paddingBottom: 14,
    }}>
      <style>{`
        .study-top-btn { width: 96px; }
        .study-top-label { display: inline; }
        @media (max-width: 460px) {
          .study-top-label { display: none; }
          .study-top-btn { width: 44px; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        {onCycleFontScale && (
          <TopButton dark={dark} onClick={onCycleFontScale} ariaLabel={`Adjust text size (currently ${Math.round(fontScale * 100)}%)`}>
            <span style={{ fontSize: 17, fontWeight: 800 }}>Aa</span>
            <span className="study-top-label" style={{ fontSize: 12, opacity: 0.8 }}>{Math.round(fontScale * 100)}%</span>
          </TopButton>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 2, lineHeight: 1.4,
          maxWidth: 'min(56vw, 360px)', margin: '0 auto', color: ON_GRADIENT_TOP.muted
        }}>{eyebrow}</div>
        {status && (
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: ON_GRADIENT_TOP.primary, marginTop: 8 }}>{status}</div>
        )}
        {timer && (
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 24, marginTop: 8, color: ON_GRADIENT_TOP.primary }}>{timer}</div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <TopButton dark={dark} onClick={onExit} ariaLabel="Exit">
          <X size={18} aria-hidden />
          <span className="study-top-label">Exit</span>
        </TopButton>
      </div>
    </div>
  )
}
