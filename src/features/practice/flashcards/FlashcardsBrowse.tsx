import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { getPulseTheme, pulseFonts, pulseType, ON_BACKGROUND } from '@/shared/theme/premiumTheme'
import { adaptColor } from '@/shared/theme/adaptColor'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import EmptyState from '@/shared/ui/feedback/EmptyState'
import TabRow from '@/shared/ui/controls/TabRow'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'
import PageShell from '@/shared/ui/layout/PageShell'
import { CardRowsSkeleton } from '@/shared/ui/feedback/Skeletons'
import { ModuleIcon } from '@/shared/icons/medicalIcons'
import { FlashcardIcon } from '@/shared/icons/FlashcardIcon'
import { LightbulbIcon, EmptyBoxIcon } from '@/shared/icons/tool-icons'
import { FLASHCARD_ACCENT } from '@/shared/theme/accents'
import { glassHoverTint } from '@/shared/theme/liquidGlass'
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

// Subject row that expands in place to its lessons, with a "Study All" button.
function SubjectRow({ dark, group, delay, expanded, forceOpen, onToggle, onStudySubject, onStudyLesson }: {
  dark: boolean
  group: SubjectGroup
  delay: number
  expanded: boolean
  forceOpen: boolean
  onToggle: () => void
  onStudySubject: () => void
  onStudyLesson: (lessonId: string) => void
}) {
  const pt = getPulseTheme(dark)
  const { subject, rows, total, due } = group
  const canExpand = rows.length > 1 && !forceOpen
  const isOpen = rows.length > 1 && (forceOpen || expanded)
  const panelId = `flashcard-subject-${subject.id}`
  const hoverTint = glassHoverTint(dark)
  // The accent as text/icon color, adjusted to stay readable in the current mode (fills keep the original).
  const accentText = adaptColor(FLASHCARD_ACCENT, dark)

  return (
    <LiquidGlassCard dark={dark} delay={delay} style={{ padding: 0 }}>
      <style>{`
        .fc-subject-toggle { transition: background 0.15s ease; }
        .fc-subject-toggle:active { background: var(--fc-hover); }
        @media (hover: hover) { .fc-subject-toggle:hover { background: var(--fc-hover); } }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
        <button
          type="button"
          onClick={canExpand ? onToggle : undefined}
          aria-expanded={canExpand ? isOpen : undefined}
          aria-controls={canExpand ? panelId : undefined}
          disabled={!canExpand}
          className="fc-subject-toggle"
          style={{
            ['--fc-hover' as any]: canExpand ? hoverTint : 'transparent',
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10,
            background: 'transparent', border: 'none', padding: 0, textAlign: 'left',
            cursor: canExpand ? 'pointer' : 'default', font: 'inherit', color: 'inherit',
          }}
        >
          <ModuleIcon value={subject.icon} size={18} color={adaptColor(subject.color || FLASHCARD_ACCENT, dark)} />
          <span style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: pt.textPrimary, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject.name}</div>
            <div style={{ color: pt.textMuted, fontSize: 11.5, marginTop: 1 }}>
              {plural(total, 'card')}
              {due > 0 && <span style={{ color: accentText }}> · {due} due</span>}
            </div>
          </span>
          {canExpand && (
            <span style={{ display: 'inline-flex', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }}>
              <ChevronDown size={16} color={pt.textMuted} />
            </span>
          )}
        </button>
        <button onClick={onStudySubject} style={{
          background: FLASHCARD_ACCENT, color: '#0f172a', border: 'none', padding: '8px 16px',
          borderRadius: 999, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: pulseFonts.body,
          flexShrink: 0,
        }}>Study All</button>
      </div>

      {rows.length > 1 && (
        <div style={{
          display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr',
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'grid-template-rows 0.25s ease, visibility 0.25s',
        }}>
          <div style={{ overflow: 'hidden' }}>
            <div
              id={panelId} role="region" aria-label={`${subject.name} lessons`} aria-hidden={!isOpen}
              style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              {rows.map(({ lesson, total: lessonTotal, toStudy }) => (
                <PulseGlassRow
                  key={lesson.id} dark={dark} radius={12} hoverTint={hoverTint}
                  onClick={() => onStudyLesson(lesson.id)}
                  role="button" tabIndex={isOpen ? 0 : -1}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStudyLesson(lesson.id) } }}
                >
                  <div style={{ padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
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
                  </div>
                </PulseGlassRow>
              ))}
            </div>
          </div>
        </div>
      )}
    </LiquidGlassCard>
  )
}

// Flashcards browse page: stage tabs, due-today card and subjects with their lessons.
export default function FlashcardsBrowse({
  dark, mod, signedIn, loading, loadError, progressLoaded, stages, activeStage, onSelectStage,
  groups, totalCards, dueTotal, dueLessons, onStartDue, onStartSubject, onStartLesson,
}: FlashcardsBrowseProps) {
  const pt = getPulseTheme(dark)
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null)
  const singleSubject = groups.length === 1
  // The accent and the module color as text/icon colors, adjusted to stay readable in the current mode.
  const accentText = adaptColor(FLASHCARD_ACCENT, dark)
  const modColor = adaptColor(mod.color, dark)

  return (
    <PageShell dark={dark} backFallback={`/module/${mod.id}`} maxWidth={PAGE_MAX_WIDTH}>
      {loadError && <ErrorBanner />}

      <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <FlashcardIcon color={accentText} size={40} />
        </div>
        <h1 style={{ fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 24, color: ON_BACKGROUND.primary, marginBottom: 4 }}>Flashcards</h1>
        {!loading && totalCards > 0 && (
          <div style={{ color: ON_BACKGROUND.secondary, fontSize: 12, fontWeight: 600 }}>
            {plural(totalCards, 'card')} · {plural(groups.length, 'subject')}
          </div>
        )}
      </div>

      {!signedIn && (
        <div style={{ marginBottom: 16 }}>
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: '12px 18px', textAlign: 'center' }}>
            <span style={{ color: pt.cobalt, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LightbulbIcon color={pt.cobalt} size={14} /> Your progress is saved on this device only. Sign in to keep it across devices.
            </span>
          </LiquidGlassCard>
        </div>
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
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <div style={{
                width: 60, height: 60, borderRadius: 18, flexShrink: 0,
                background: `${FLASHCARD_ACCENT}22`, border: `1px solid ${FLASHCARD_ACCENT}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FlashcardIcon color={accentText} size={28} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <h3 style={{ ...pulseType.sectionLabel, fontSize: 15, color: accentText, marginBottom: 6 }}>Due Today</h3>
                <div style={{ ...pulseType.small, color: pt.textMuted }}>
                  {plural(dueTotal, 'card')} · {plural(dueLessons, 'lesson')}
                </div>
              </div>
              <button onClick={onStartDue} style={{
                background: FLASHCARD_ACCENT, color: '#0f172a', border: 'none', padding: '12px 24px',
                borderRadius: 999, fontWeight: 800, cursor: 'pointer', fontFamily: pulseFonts.body, flexShrink: 0,
              }}>Start →</button>
            </div>
          </LiquidGlassCard>
        </div>
      )}

      <h3 style={{ ...pulseType.sectionLabel, color: ON_BACKGROUND.muted, marginBottom: 16 }}>Study by Subject</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!loading && groups.map((group, i) => (
          <SubjectRow
            key={group.subject.id}
            dark={dark}
            group={group}
            delay={i * 70}
            expanded={expandedSubjectId === group.subject.id}
            forceOpen={singleSubject}
            onToggle={() => setExpandedSubjectId(prev => prev === group.subject.id ? null : group.subject.id)}
            onStudySubject={() => onStartSubject(group.subject.id)}
            onStudyLesson={onStartLesson}
          />
        ))}
        {loading && <CardRowsSkeleton count={3} label="Loading flashcards" />}
        {!loading && groups.length === 0 && !loadError && (
          <EmptyState dark={dark} icon={<EmptyBoxIcon color={pt.sub} size={16} />} message="No flashcards here yet" />
        )}
      </div>
    </PageShell>
  )
}
