import { useNavigate } from 'react-router-dom'
import { getPulseTheme, pulseType } from '@/shared/theme/premiumTheme'
import { isSafeExternalUrl } from '@/shared/utils/embedUrl'
import { StudyMaterialsIcon, FolderIcon } from '@/shared/icons/tool-icons'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import SectionHeader from '@/shared/ui/layout/SectionHeader'

interface StudyMaterialsSectionProps {
  dark: boolean
  moduleId: string
  presentFileTypes: Set<string>
  driveUrl: string
}

// One card of the section: an icon tile, a title with a hint, and what happens on tap.
interface MaterialCard {
  key: string
  Icon: (p: { color: string; size?: number }) => JSX.Element
  title: string
  hint: string
  onOpen: () => void
}

// "Study Materials" section on the module page: a Files card and a University Google Drive card.
// The Drive URL is validated (http/https only) before it's ever rendered as a clickable card or window.open target.
export default function StudyMaterialsSection({ dark, moduleId, presentFileTypes, driveUrl }: StudyMaterialsSectionProps) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const driveUrlIsSafe = !!driveUrl && isSafeExternalUrl(driveUrl)

  const cards: MaterialCard[] = []

  if (presentFileTypes.size > 0) {
    cards.push({
      key: 'files', Icon: FolderIcon, title: 'Files', hint: 'Explanations, questions, lectures & more',
      onOpen: () => navigate(`/files?module=${moduleId}`),
    })
  }

  if (driveUrlIsSafe) {
    cards.push({
      key: 'drive', Icon: StudyMaterialsIcon, title: 'University Google Drive', hint: 'Lectures, recordings & more',
      onOpen: () => window.open(driveUrl, '_blank', 'noopener,noreferrer'),
    })
  }

  if (cards.length === 0) return null

  const rendered = cards.map(({ key, Icon, title, hint, onOpen }) => (
    <LiquidGlassCard key={key} dark={dark} delay={0} onClick={onOpen}
      style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        background: `${pt.cobalt}20`, border: `1px solid ${pt.cobaltBorder}`,
        borderRadius: 12, width: 44, height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Icon color={pt.cobalt} size={20} />
      </div>
      <div>
        <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>{title}</div>
        <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>{hint}</div>
      </div>
    </LiquidGlassCard>
  ))

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionHeader Icon={StudyMaterialsIcon}>Study Materials</SectionHeader>
      {rendered.length === 1 ? (
        <div className="auto-grid-single">{rendered[0]}</div>
      ) : (
        <div className="summary-practice-row">{rendered}</div>
      )}
    </div>
  )
}
