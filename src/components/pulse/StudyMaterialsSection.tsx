import { useNavigate } from 'react-router-dom'
import { getPulseTheme, pulseType, ON_GRADIENT_TOP } from '../../premiumTheme'
import { isSafeExternalUrl } from '../../lib/embedUrl'
import { StudyMaterialsIcon, FolderIcon } from '../ui/tool-icons'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'

interface StudyMaterialsSectionProps {
  dark: boolean
  moduleId: string
  presentFileTypes: Set<string>
  driveUrl: string
}

// "Study Materials" section (Files card + University Google Drive
// card) — identical on ModulePage and StagePage, both linking to the
// same Files page. The Drive URL is validated (http/https only)
// before it's ever rendered as a clickable card or window.open target.
export default function StudyMaterialsSection({ dark, moduleId, presentFileTypes, driveUrl }: StudyMaterialsSectionProps) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const driveUrlIsSafe = !!driveUrl && isSafeExternalUrl(driveUrl)

  const cards: JSX.Element[] = []

  if (presentFileTypes.size > 0) {
    cards.push(
      <LiquidGlassCard key="files" dark={dark} delay={0}
        onClick={() => navigate(`/files?module=${moduleId}`)}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          background: `${pt.cobalt}20`, border: `1px solid ${pt.cobaltBorder}`,
          borderRadius: 12, width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <FolderIcon color={pt.cobalt} size={20} />
        </div>
        <div>
          <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>Files</div>
          <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>Explanations, questions, lectures & more</div>
        </div>
      </LiquidGlassCard>
    )
  }

  if (driveUrlIsSafe) {
    cards.push(
      <LiquidGlassCard key="drive" dark={dark} delay={0}
        onClick={() => window.open(driveUrl, '_blank', 'noopener,noreferrer')}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          background: `${pt.cobalt}20`, border: `1px solid ${pt.cobaltBorder}`,
          borderRadius: 12, width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <StudyMaterialsIcon color={pt.cobalt} size={20} />
        </div>
        <div>
          <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>University Google Drive</div>
          <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>Lectures, recordings & more</div>
        </div>
      </LiquidGlassCard>
    )
  }

  if (cards.length === 0) return null

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ ...pulseType.sectionLabel, color: ON_GRADIENT_TOP.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <StudyMaterialsIcon color={ON_GRADIENT_TOP.muted} size={14} /> Study Materials
      </h2>
      {cards.length === 1 ? (
        <div className="auto-grid-single">{cards[0]}</div>
      ) : (
        <div className="summary-practice-row">{cards}</div>
      )}
    </div>
  )
}
