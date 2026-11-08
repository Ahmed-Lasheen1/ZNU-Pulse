import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { getPulseTheme, pulseType } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import { ScheduleIcon, SearchIcon2 } from '@/shared/icons/tool-icons'
import { storageGet, storageSet } from '@/core/safeStorage'
import { wrapText } from '@/shared/utils/textStyles'
import { daysFromToday, formatDayHeading } from '@/features/tools/schedule/scheduleDates'
import { usePlanProgress } from '@/features/tools/schedule/usePlanProgress'
import type { PlanItem, ScheduleRow } from '@/features/tools/schedule/types'

interface StudyPlanCardProps {
  dark: boolean
  schedule: ScheduleRow
  accent: string
  delay: number
  defaultOpen: boolean
  onViewImage: () => void
}

interface PlanGroup {
  date: string | null
  items: PlanItem[]
}

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

// Groups items by day (oldest first); items without a date go last.
function groupItems(items: PlanItem[]): PlanGroup[] {
  const byDate = new Map<string, PlanItem[]>()
  const undated: PlanItem[] = []
  items.forEach(item => {
    if (!item.date) { undated.push(item); return }
    const list = byDate.get(item.date) || []
    list.push(item)
    byDate.set(item.date, list)
  })
  const groups: PlanGroup[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({ date, items: list }))
  if (undated.length > 0) groups.push({ date: null, items: undated })
  return groups
}

// Study plan card: collapsible day-by-day checklist, or a plain image row when the plan has no items.
// Linked items open their lesson's practice or flashcards and tick themselves once the lesson is studied.
export default function StudyPlanCard({ dark, schedule, accent, delay, defaultOpen, onViewImage }: StudyPlanCardProps) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const items = schedule.items || []
  const hasItems = items.length > 0
  const [open, setOpen] = useState(defaultOpen)
  const [done, setDone] = useState(() => readDone(schedule.id))
  const autoDone = usePlanProgress(schedule, open)

  // An item counts as done when ticked by hand or completed through study activity.
  const isItemDone = (itemId: string) => done.has(itemId) || autoDone.has(itemId)

  const doneCount = items.filter(item => isItemDone(item.id)).length
  const percent = hasItems ? Math.round((doneCount / items.length) * 100) : 0

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

  // Opens the lesson's practice questions or flashcards for a linked item.
  function openLink(item: PlanItem) {
    if (!item.link) return
    const tool = item.link.kind === 'practice' ? 'mcq' : 'flashcards'
    navigate(`/${tool}?module=${schedule.module_id}&lesson=${item.link.lesson_id}`)
  }

  const subtitle = [hasItems ? `${doneCount}/${items.length} done` : null, schedule.week].filter(Boolean).join(' · ')

  return (
    <LiquidGlassCard dark={dark} delay={delay} style={{ padding: 0 }}>
      <button
        type="button"
        onClick={handleHeader}
        aria-expanded={hasItems ? open : undefined}
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
          style={{ height: 4, borderRadius: 999, margin: open ? '0 18px 12px' : '0 18px 16px', background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}
        >
          <div style={{ height: '100%', width: `${percent}%`, background: accent, borderRadius: 999, transition: 'width 0.3s ease' }} />
        </div>
      )}

      {hasItems && open && (
        <div style={{ padding: '0 18px 16px' }}>
          {groupItems(items).map(group => {
            const diff = group.date ? daysFromToday(group.date) : null
            const allDone = group.items.every(item => isItemDone(item.id))
            const headingColor = diff === 0 ? accent : diff !== null && diff < 0 && !allDone ? pt.amber : pt.textMuted
            return (
              <div key={group.date ?? 'anytime'} style={{ marginTop: 10 }}>
                <div style={{ ...pulseType.sectionLabel, fontSize: 11, color: headingColor, marginBottom: 2 }}>
                  {group.date ? formatDayHeading(group.date) : 'Anytime'}
                </div>
                {group.items.map(item => {
                  const isDone = isItemDone(item.id)
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <button
                        type="button" role="checkbox" aria-checked={isDone}
                        onClick={() => toggleItem(item.id)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0,
                          background: 'transparent', border: 'none', padding: '7px 0',
                          cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit',
                        }}
                      >
                        <span aria-hidden style={{
                          width: 18, height: 18, borderRadius: 6, flexShrink: 0, marginTop: 1,
                          border: `1.5px solid ${isDone ? accent : pt.faint}`,
                          background: isDone ? accent : 'transparent', color: '#0f172a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900,
                        }}>{isDone && '✓'}</span>
                        <span dir="auto" style={{
                          ...pulseType.body, color: isDone ? pt.textMuted : pt.textPrimary,
                          textDecoration: isDone ? 'line-through' : 'none', flex: 1, minWidth: 0, ...wrapText,
                        }}>{item.text}</span>
                      </button>
                      {item.link && (
                        <button
                          type="button" onClick={() => openLink(item)}
                          aria-label={item.link.kind === 'practice' ? `Practice questions: ${item.text}` : `Flashcards: ${item.text}`}
                          style={{
                            flexShrink: 0, marginTop: 5, background: 'transparent', border: `1px solid ${accent}66`, color: accent,
                            borderRadius: 999, padding: '3px 11px', fontWeight: 700, fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >{item.link.kind === 'practice' ? 'Practice →' : 'Flashcards →'}</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {schedule.url && (
            <button type="button" onClick={onViewImage} style={{
              marginTop: 14, background: 'transparent', border: `1px solid ${accent}66`, color: accent,
              borderRadius: 999, padding: '7px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
              fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <SearchIcon2 color={accent} size={12} /> View schedule image
            </button>
          )}
        </div>
      )}
    </LiquidGlassCard>
  )
}
