import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { getPulseTheme, pulseType } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'
import { useToast } from '@/shared/ui/feedback/ToastProvider'
import { ScheduleIcon, SearchIcon2 } from '@/shared/icons/tool-icons'
import { ModuleIcon } from '@/shared/icons/medicalIcons'
import { storageGet, storageSet } from '@/core/safeStorage'
import { wrapText } from '@/shared/utils/textStyles'
import { daysFromToday, formatDayHeading } from '@/features/tools/schedule/scheduleDates'
import { usePlanProgress } from '@/features/tools/schedule/usePlanProgress'
import { usePlanLookups, type PlanLookups } from '@/features/tools/schedule/usePlanLookups'
import { PLAN_TOOL_META, planToolColor, itemLessonId, itemTools } from '@/features/tools/schedule/planItems'
import type { PlanItem, PlanLinkKind, ScheduleRow } from '@/features/tools/schedule/types'

interface StudyPlanCardProps {
  dark: boolean
  schedule: ScheduleRow
  accent: string
  delay: number
  defaultOpen: boolean
  onViewImage: () => void
}

interface SubjectGroup {
  key: string
  name: string
  color: string | null
  icon: string | null
  items: PlanItem[]
}

const NO_SUBJECT = 'none'

// Storage key of the plan items a student has ticked on this device.
const doneKey = (scheduleId: string) => `schedule_plan_done_${scheduleId}`

// Reads the ticked item ids of a plan from this device.
function readDone(scheduleId: string): Set<string> {
  try {
    return new Set(JSON.parse(storageGet(doneKey(scheduleId)) || '[]'))
  } catch {
    return new Set()
  }
}

// Orders items by date (oldest first); items without a date go last.
function sortByDate(items: PlanItem[]) {
  return [...items].sort((a, b) => (a.date && b.date ? a.date.localeCompare(b.date) : a.date ? -1 : b.date ? 1 : 0))
}

// Groups items by subject in the module's subject order; items without a known subject go last under "General".
function groupBySubject(items: PlanItem[], lookups: PlanLookups): SubjectGroup[] {
  if (!lookups.loaded) return [{ key: NO_SUBJECT, name: '', color: null, icon: null, items: sortByDate(items) }]

  const lessonSubject = new Map(lookups.lessons.map(l => [l.id, l.subject_id]))
  const known = new Set(lookups.subjects.map(s => s.id))
  const buckets = new Map<string, PlanItem[]>()
  items.forEach(item => {
    const raw = item.subject_id || lessonSubject.get(itemLessonId(item) ?? '') || null
    const key = raw && known.has(raw) ? raw : NO_SUBJECT
    buckets.set(key, [...(buckets.get(key) || []), item])
  })

  const groups: SubjectGroup[] = lookups.subjects
    .filter(s => buckets.has(s.id))
    .map(s => ({ key: s.id, name: s.name, color: s.color || '#34d399', icon: s.icon || null, items: sortByDate(buckets.get(s.id) as PlanItem[]) }))
  if (buckets.has(NO_SUBJECT)) groups.push({ key: NO_SUBJECT, name: 'General', color: null, icon: null, items: sortByDate(buckets.get(NO_SUBJECT) as PlanItem[]) })
  return groups
}

// Style of the small colored tool buttons, same look as the Study by Lesson buttons.
function toolBtn(color: string) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: `${color}18`, border: `1px solid ${color}55`, color,
    borderRadius: 999, padding: '6px 12px', fontSize: 11.5, fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
  } as const
}

// Study plan card: collapsible checklist grouped by subject, or a plain image row when the plan has no items.
// The list expands with a height transition (grid-template-rows), like the Study by Lesson accordion.
// Each item is a glass row like a lesson row there: checkbox and text on the left, tool buttons on the right.
// Items open their lesson's summary, flashcards and practice, and tick themselves once the lesson is studied.
export default function StudyPlanCard({ dark, schedule, accent, delay, defaultOpen, onViewImage }: StudyPlanCardProps) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void
  const items = schedule.items || []
  const hasItems = items.length > 0
  const [open, setOpen] = useState(defaultOpen)
  const [done, setDone] = useState(() => readDone(schedule.id))
  const [pickerItemId, setPickerItemId] = useState<string | null>(null)
  const autoDone = usePlanProgress(schedule, hasItems)
  const lookups = usePlanLookups(schedule.module_id, hasItems)
  const panelId = `plan-items-${schedule.id}`

  // An item counts as done when ticked by hand or completed through study activity.
  const isItemDone = (itemId: string) => done.has(itemId) || autoDone.has(itemId)

  const doneCount = items.filter(item => isItemDone(item.id)).length
  const percent = hasItems ? Math.round((doneCount / items.length) * 100) : 0
  const groups = groupBySubject(items, lookups)
  const showHeaders = groups.some(g => g.key !== NO_SUBJECT)

  // Ticks or unticks one plan item and saves the result on this device; study-completed items stay ticked.
  function toggleItem(itemId: string) {
    if (autoDone.has(itemId)) return
    const next = new Set(done)
    if (next.has(itemId)) next.delete(itemId)
    else next.add(itemId)
    setDone(next)
    storageSet(doneKey(schedule.id), JSON.stringify([...next]))
  }

  // Expands the plan, or opens the image when there are no plan items.
  function handleHeader() {
    if (hasItems) setOpen(o => !o)
    else onViewImage()
  }

  // Opens one summary in the Summaries page.
  function openSummaryPage(summaryId: string) {
    navigate(`/summaries?module=${schedule.module_id}&summary=${summaryId}`)
  }

  // Opens a tool of an item: practice and flashcards go to their lesson, summaries open directly or via a small picker.
  function openTool(item: PlanItem, kind: PlanLinkKind) {
    const lessonId = itemLessonId(item)
    if (!lessonId) return
    if (kind === 'practice') { navigate(`/mcq?module=${schedule.module_id}&lesson=${lessonId}`); return }
    if (kind === 'flashcards') { navigate(`/flashcards?module=${schedule.module_id}&lesson=${lessonId}`); return }
    // Summaries are unknown until the lookups finish, so an early tap is ignored instead of opening an empty picker.
    if (!lookups.loaded) return
    const list = lookups.summariesByLesson[lessonId] || []
    if (list.length === 0) { showToast('No summary added for this lesson yet', 'info'); return }
    if (list.length === 1) { openSummaryPage(list[0].id); return }
    setPickerItemId(prev => (prev === item.id ? null : item.id))
  }

  // Renders one plan item as a glass row: checkbox, text, date and note on the left, tool buttons on the right.
  function renderItem(item: PlanItem) {
    const isDone = isItemDone(item.id)
    const tools = itemTools(item)
    const lessonId = itemLessonId(item)
    const diff = item.date ? daysFromToday(item.date) : null
    const dateColor = diff === 0 ? accent : diff !== null && diff < 0 && !isDone ? pt.amber : pt.textMuted
    const summaries = lessonId ? lookups.summariesByLesson[lessonId] || [] : []

    return (
      <div key={item.id}>
        <PulseGlassRow dark={dark} radius={12}>
          <div className="plan-item-row">
            <button
              type="button" role="checkbox" aria-checked={isDone}
              className="plan-item-main glass-focus-ring"
              onClick={() => toggleItem(item.id)}
            >
              <span aria-hidden style={{
                width: 18, height: 18, borderRadius: 6, flexShrink: 0, marginTop: 1,
                border: `1.5px solid ${isDone ? accent : pt.faint}`,
                background: isDone ? accent : 'transparent', color: '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900,
              }}>{isDone && '✓'}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span dir="auto" style={{
                  ...pulseType.body, display: 'block', color: isDone ? pt.textMuted : pt.textPrimary,
                  textDecoration: isDone ? 'line-through' : 'none', ...wrapText,
                }}>{item.text}</span>
                {item.date && (
                  <span style={{ ...pulseType.small, display: 'block', color: dateColor, fontWeight: 700, marginTop: 1 }}>
                    {formatDayHeading(item.date)}
                  </span>
                )}
                {item.note && (
                  <span dir="auto" style={{ ...pulseType.small, display: 'block', color: pt.textMuted, marginTop: 2, ...wrapText }}>
                    {item.note}
                  </span>
                )}
              </span>
            </button>

            {tools.length > 0 && lessonId && (
              <div className="plan-item-actions">
                {tools.map(kind => {
                  const meta = PLAN_TOOL_META[kind]
                  const color = planToolColor(kind, pt)
                  return (
                    <button
                      key={kind} type="button" onClick={() => openTool(item, kind)}
                      aria-label={`${meta.label}: ${item.text}`} style={toolBtn(color)}
                    >
                      <meta.Icon color={color} size={12} /> {meta.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </PulseGlassRow>

        {pickerItemId === item.id && summaries.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 4px 0 34px' }}>
            {summaries.map(s => (
              <button key={s.id} onClick={() => openSummaryPage(s.id)} style={{
                background: 'transparent', border: 'none', textAlign: 'start', cursor: 'pointer',
                color: pt.sub, fontSize: 12, fontWeight: 600, padding: '4px 0', fontFamily: 'inherit',
              }}>• {s.title}</button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const subtitle = [hasItems ? `${doneCount}/${items.length} done` : null, schedule.week].filter(Boolean).join(' · ')

  return (
    <LiquidGlassCard dark={dark} delay={delay} style={{ padding: 0 }}>
      <style>{`
        .plan-item-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; flex-wrap: wrap; }
        .plan-item-main {
          flex: 1; min-width: 200px; display: flex; align-items: flex-start; gap: 10px;
          background: transparent; border: none; padding: 0; border-radius: 8px;
          cursor: pointer; text-align: start; font-family: inherit; color: inherit;
        }
        .plan-item-actions { display: flex; flex-wrap: wrap; gap: 6px; flex-shrink: 0; }
        @media (max-width: 480px) {
          .plan-item-main { min-width: 100%; }
          .plan-item-actions { min-width: 100%; padding-inline-start: 28px; }
        }
      `}</style>

      <button
        type="button"
        onClick={handleHeader}
        aria-expanded={hasItems ? open : undefined}
        aria-controls={hasItems ? panelId : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, width: '100%',
          background: 'transparent', border: 'none', padding: '14px 18px',
          cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit', color: 'inherit',
        }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
          background: `${accent}22`, border: `1px solid ${accent}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ScheduleIcon color={accent} size={19} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div dir="auto" style={{ ...pulseType.cardTitle, color: pt.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {schedule.title}
          </div>
          {subtitle && <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {hasItems ? (
          <span style={{ display: 'inline-flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }}>
            <ChevronDown size={16} color={pt.textMuted} />
          </span>
        ) : (
          <span style={{
            background: accent, color: '#0f172a', borderRadius: 10, padding: '7px 13px',
            fontWeight: 700, fontSize: 12, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <SearchIcon2 color="#0f172a" size={13} /> View
          </span>
        )}
      </button>

      {hasItems && (
        <div
          role="progressbar" aria-label="Plan progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
          style={{ height: 4, borderRadius: 999, margin: open ? '0 18px 12px' : '0 18px 16px', background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)', overflow: 'hidden', transition: 'margin 0.25s ease' }}
        >
          <div style={{ height: '100%', width: `${percent}%`, background: accent, borderRadius: 999, transition: 'width 0.3s ease' }} />
        </div>
      )}

      {hasItems && (
        <div style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          visibility: open ? 'visible' : 'hidden',
          transition: 'grid-template-rows 0.25s ease, visibility 0.25s',
        }}>
          <div style={{ overflow: 'hidden' }}>
            <div
              id={panelId} role="region" aria-label={`${schedule.title} items`} aria-hidden={!open}
              style={{ padding: '0 12px 16px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {groups.map(group => (
                  <div key={group.key}>
                    {showHeaders && (
                      <div style={{
                        ...pulseType.sectionLabel, fontSize: 11, margin: '0 4px 8px',
                        color: group.color || pt.textMuted, display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {group.icon && <ModuleIcon value={group.icon} size={14} color={group.color || pt.textMuted} />}
                        <span style={{ minWidth: 0, ...wrapText }}>{group.name}</span>
                        <span style={{ color: pt.textMuted, fontWeight: 600, letterSpacing: 0, textTransform: 'none' }}>
                          · {group.items.filter(item => isItemDone(item.id)).length}/{group.items.length}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {group.items.map(renderItem)}
                    </div>
                  </div>
                ))}
              </div>

              {schedule.url && (
                <button type="button" onClick={onViewImage} style={{
                  marginTop: 16, background: 'transparent', border: `1px solid ${accent}66`, color: accent,
                  borderRadius: 999, padding: '7px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <SearchIcon2 color={accent} size={12} /> View schedule image
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </LiquidGlassCard>
  )
}
