import { useState } from 'react'
import { getPulseTheme, pulseType } from '@/shared/theme/premiumTheme'
import { adaptColor } from '@/shared/theme/adaptColor'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import EmptyState from '@/shared/ui/feedback/EmptyState'
import InfoNotice from '@/shared/ui/feedback/InfoNotice'
import Button from '@/shared/ui/controls/Button'
import TabRow from '@/shared/ui/controls/TabRow'
import ActionCard from '@/shared/ui/layout/ActionCard'
import SectionHeader from '@/shared/ui/layout/SectionHeader'
import SubjectAccordion, { AccordionRow } from '@/shared/ui/layout/SubjectAccordion'
import PageShell from '@/shared/ui/layout/PageShell'
import PageIntro from '@/shared/ui/layout/PageIntro'
import { CardRowsSkeleton } from '@/shared/ui/feedback/Skeletons'
import { ModuleIcon } from '@/shared/icons/medicalIcons'
import { FlashcardIcon } from '@/shared/icons/FlashcardIcon'
import { EmptyBoxIcon } from '@/shared/icons/tool-icons'
import { FLASHCARD_ACCENT } from '@/shared/theme/accents'
import { plural } from '@/shared/utils/format'

interface BrowseModule { id: string; name: string; icon?: string | null; color: string }
interface BrowseSubject { id: string; name: string; icon?: string | null; color?: string | null }
interface BrowseLesson { id: string; title: string }
interface LessonRow { lesson: BrowseLesson; total: number; due: number; toStudy: number }

export interface SubjectGroup {
  subject: BrowseSubject
  rows: LessonRow[]
  total: number
  due: number
  toStudy: number
}

interface FlashcardsBrowseProps {
  dark: boolean
  mod: BrowseModule
  signedIn: boolean
  loading: boolean
  loadError: boolean
  progressLoaded: boolean
  stages: any[]
  activeStage: string
  onSelectStage: (value: string) => void
  groups: SubjectGroup[]
  totalCards: number
  dueTotal: number
  dueLessons: number
  onStartDue: () => void
  onStartSubject: (subjectId: string) => void
  onStartLesson: (lessonId: string) => void
}

const PAGE_MAX_WIDTH = 900

// Flashcards browse page: stage tabs, due-today card and subjects with their lessons.
export default function FlashcardsBrowse({
  dark, mod, signedIn, loading, loadError, progressLoaded, stages, activeStage, onSelectStage,
  groups, totalCards, dueTotal, dueLessons, onStartDue, onStartSubject, onStartLesson,
}: FlashcardsBrowseProps) {
  const pt = getPulseTheme(dark)
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null)
  const singleSubject = groups.length === 1
  const accentText = adaptColor(FLASHCARD_ACCENT, dark)
  const modColor = adaptColor(mod.color, dark)

  return (
    <PageShell dark={dark} backFallback={`/module/${mod.id}`} maxWidth={PAGE_MAX_WIDTH}>
      {loadError && <ErrorBanner />}

      <PageIntro
        dark={dark}
        emoji={<FlashcardIcon color={accentText} size={40} />}
        title="Flashcards"
        subtitle={!loading && totalCards > 0 ? `${plural(totalCards, 'card')} · ${plural(groups.length, 'subject')}` : undefined}
        paddingBottom={16}
      />

      {!signedIn && (
        <InfoNotice dark={dark} marginBottom={16}>
          Your progress is saved on this device only. Sign in to keep it across devices.
        </InfoNotice>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        color: modColor, fontWeight: 700, fontSize: 14,
      }}>
        <ModuleIcon value={mod.icon} size={18} color={modColor} /> {mod.name}
      </div>

      {stages.length > 0 && (
        <TabRow
          items={[
            { value: 'all', label: 'All' },
            ...stages.map(s => ({ value: s.value, label: s.Icon ? s.title : `${s.emoji} ${s.title}`, Icon: s.Icon })),
          ]}
          active={activeStage}
          onSelect={onSelectStage}
          dark={dark}
          accentColor={mod.color}
          style={{ marginBottom: 16 }}
        />
      )}

      {!loading && progressLoaded && dueTotal > 0 && (
        <div style={{ marginBottom: 32 }}>
          <ActionCard
            dark={dark}
            accent={FLASHCARD_ACCENT}
            icon={<FlashcardIcon color={accentText} size={28} />}
            title="Due Today"
            subtitle={
              <div style={{ ...pulseType.small, color: pt.textMuted }}>
                {plural(dueTotal, 'card')} · {plural(dueLessons, 'lesson')}
              </div>
            }
            action={
              <Button dark={dark} variant="solid" size="md" color={FLASHCARD_ACCENT} onClick={onStartDue} style={{ flexShrink: 0 }}>
                Start →
              </Button>
            }
          />
        </div>
      )}

      <SectionHeader as="h3">Study by Subject</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!loading && groups.map(({ subject, rows, total, due }, i) => (
          <SubjectAccordion
            key={subject.id}
            dark={dark}
            id={`flashcard-subject-${subject.id}`}
            label={`${subject.name} lessons`}
            delay={i * 70}
            icon={<ModuleIcon value={subject.icon} size={18} color={adaptColor(subject.color || FLASHCARD_ACCENT, dark)} />}
            title={subject.name}
            subtitle={
              <>
                {plural(total, 'card')}
                {due > 0 && <span style={{ color: accentText }}> · {due} due</span>}
              </>
            }
            action={
              <Button dark={dark} variant="solid" size="sm" color={FLASHCARD_ACCENT} onClick={() => onStartSubject(subject.id)} style={{ flexShrink: 0 }}>
                Study All
              </Button>
            }
            expanded={expandedSubjectId === subject.id}
            forceOpen={singleSubject}
            hasPanel={rows.length > 1}
            onToggle={() => setExpandedSubjectId(prev => prev === subject.id ? null : subject.id)}
          >
            {rows.map(({ lesson, total: lessonTotal, toStudy }) => (
              <AccordionRow key={lesson.id} dark={dark} onClick={() => onStartLesson(lesson.id)}>
                <span style={{ minWidth: 0 }}>
                  <div style={{ color: pt.textPrimary, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</div>
                  <div style={{ color: pt.textMuted, fontSize: 11, marginTop: 1 }}>{plural(lessonTotal, 'card')}</div>
                </span>
                <span style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap',
                  background: toStudy > 0 ? `${FLASHCARD_ACCENT}26` : 'transparent',
                  color: toStudy > 0 ? accentText : pt.textMuted,
                  border: toStudy > 0 ? 'none' : `1px solid ${pt.border}`,
                }}>{toStudy > 0 ? `${toStudy} to study` : 'Review anyway'}</span>
              </AccordionRow>
            ))}
          </SubjectAccordion>
        ))}
        {loading && <CardRowsSkeleton count={3} label="Loading flashcards" />}
        {!loading && groups.length === 0 && !loadError && (
          <EmptyState dark={dark} icon={<EmptyBoxIcon color={pt.sub} size={16} />} message="No flashcards here yet" />
        )}
      </div>
    </PageShell>
  )
}
