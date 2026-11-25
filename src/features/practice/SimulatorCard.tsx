import { getPulseTheme, pulseType } from '@/shared/theme/premiumTheme'
import { adaptColor } from '@/shared/theme/adaptColor'
import ActionCard from '@/shared/ui/layout/ActionCard'
import Button from '@/shared/ui/controls/Button'
import { TargetIcon } from '@/shared/icons/tool-icons'
import { MCQ_ACCENT } from '@/shared/theme/accents'
import { countLabel, plural } from '@/shared/utils/format'

interface SimulatorCardProps {
  dark: boolean
  // Stage title shown before "Simulator".
  title: string
  total: number
  subjectCount: number
  onStart: () => void
}

// Stage simulator card shown on the module page and in the MCQ bank (a thin wrapper over ActionCard).
// On phones the subtitle drops the "new mix each time" note.
export default function SimulatorCard({ dark, title, total, subjectCount, onStart }: SimulatorCardProps) {
  const pt = getPulseTheme(dark)
  const base = `${countLabel(total)} · ${plural(subjectCount, 'subject')}`

  return (
    <>
      <style>{`
        .sim-sub-short { display: none; }
        @media (max-width: 480px) {
          .sim-sub-full { display: none; }
          .sim-sub-short { display: inline; }
        }
      `}</style>
      <ActionCard
        dark={dark}
        accent={MCQ_ACCENT}
        icon={<TargetIcon color={adaptColor(MCQ_ACCENT, dark)} size={28} />}
        title={`${title} Simulator`}
        subtitle={
          <span style={{ ...pulseType.small, color: pt.textSecondary, fontWeight: 600 }}>
            <span className="sim-sub-full">{base} · new mix each time</span>
            <span className="sim-sub-short">{base}</span>
          </span>
        }
        action={
          <Button dark={dark} variant="solid" size="md" color={MCQ_ACCENT} onClick={onStart} style={{ flexShrink: 0 }}>
            Start →
          </Button>
        }
      />
    </>
  )
}
