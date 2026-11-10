import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/core/supabase'
import { getPulseTheme, pulseType, ON_GRADIENT_TOP } from '@/shared/theme/premiumTheme'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import TabRow from '@/shared/ui/controls/TabRow'
import MediaOverlay from '@/shared/ui/overlay/MediaOverlay'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'
import PageShell from '@/shared/ui/layout/PageShell'
import PageIntro from '@/shared/ui/layout/PageIntro'
import EmptyState from '@/shared/ui/feedback/EmptyState'
import { ScheduleSkeleton } from '@/shared/ui/feedback/Skeletons'
import OfflineNote from '@/shared/ui/feedback/OfflineNote'
import { useToast } from '@/shared/ui/feedback/ToastProvider'
import { cachedSnapshot } from '@/core/dataCache'
import { getDriveOrRawUrl } from '@/shared/utils/embedUrl'
import { useModules } from '@/core/contexts'
import { useHistoryOverlay } from '@/shared/hooks/useHistoryOverlay'
import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion'
import { ScheduleIcon, EmptyBoxIcon } from '@/shared/icons/tool-icons'
import { ExamIcon } from '@/shared/icons/medicalIcons'
import { glassHoverTint } from '@/shared/theme/liquidGlass'
import { SECTION_GAP } from '@/shared/theme/layout'
import StudyPlanCard from '@/features/tools/schedule/StudyPlanCard'
import ExamScheduleCard from '@/features/tools/schedule/ExamScheduleCard'
import { daysFromToday } from '@/features/tools/schedule/scheduleDates'
import type { ScheduleRow } from '@/features/tools/schedule/types'

const SCHEDULE_ACCENT = '#a78bfa'

const TASK_GAP = 16

// Gap left above a card scrolled into view so the fixed header never covers it.
const SCROLL_OFFSET = 90

interface ScheduleModule {
  id: string
  name: string
  icon?: string | null
  color: string
  status: 'active' | 'completed'
}

type ScheduleType = 'study' | 'exam'

// Sort key for an exam: upcoming first (soonest), then undated, then finished (most recent first).
function examSortKey(exam: ScheduleRow) {
  const diffs = (exam.dates || []).map(daysFromToday)
  const upcoming = diffs.filter(d => d >= 0).sort((a, b) => a - b)
  if (upcoming.length > 0) return upcoming[0]
  if (diffs.length === 0) return 50000
  return 100000 + Math.abs(Math.max(...diffs))
}

// Schedules page: study plans and exam schedules per module, with an optional image for each.
export default function Schedule({ dark }: { dark: boolean }) {
  const pt = getPulseTheme(dark)
  const location = useLocation()
  const reduced = usePrefersReducedMotion()
  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void
  const { modules, modulesLoaded, modulesError } = useModules() as {
    modules: ScheduleModule[]
    modulesLoaded: boolean
    modulesError: boolean
  }
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [activeModule, setActiveModule] = useState<string | null>(null)

  const params = new URLSearchParams(location.search)
  const moduleParam = params.get('module')
  const typeParam = params.get('type')
  const itemParam = params.get('item')

  const [activeType, setActiveType] = useState<ScheduleType>(() => (typeParam === 'exam' ? 'exam' : 'study'))
  const [loading, setLoading] = useState(true)
  const [viewer, setViewer] = useState<ScheduleRow | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [savedCopy, setSavedCopy] = useState(false)

  const appliedModuleParamRef = useRef<string | null>(null)
  const openedItemRef = useRef<string | null>(null)

  useHistoryOverlay(!!viewer, () => setViewer(null))

  // Tabs show active modules; a completed module stays listed while it is the selected one (e.g. from a search link).
  const activeModules = modules.filter(m => m.status === 'active')
  const baseModules = activeModules.length > 0 ? activeModules : modules
  const currentModule = modules.find(m => m.id === activeModule)
  const selectableModules = currentModule && !baseModules.some(m => m.id === currentModule.id)
    ? [...baseModules, currentModule]
    : baseModules

  // Picks the module from the link, or the first selectable one.
  useEffect(() => {
    if (moduleParam && modules.some(m => m.id === moduleParam)) {
      if (appliedModuleParamRef.current !== moduleParam) {
        appliedModuleParamRef.current = moduleParam
        setActiveModule(moduleParam)
      }
      return
    }
    if (!modulesLoaded) return
    if (selectableModules.length === 0) {
      setLoading(false)
      return
    }
    if (!activeModule) setActiveModule(selectableModules[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesLoaded, modules, moduleParam])

  // Loads the module's schedules from the saved copy, refreshing in the background.
  useEffect(() => {
    if (!activeModule) return
    let ignore = false
    async function fetchData() {
      setLoading(true)
      setLoadError(false)
      const { data, error, fromCache } = await cachedSnapshot(
        `schedules:${activeModule}`,
        () => supabase.from('schedules').select('*').eq('module_id', activeModule).order('created_at'),
        {
          onUpdate: fresh => {
            if (ignore || !fresh) return
            setSchedules(fresh as ScheduleRow[])
            setSavedCopy(false)
          },
        }
      )
      if (ignore) return
      if (data) setSchedules(data as ScheduleRow[])
      setSavedCopy(fromCache)
      if (error) setLoadError(true)
      setLoading(false)
    }
    fetchData()
    return () => { ignore = true }
  }, [activeModule])

  // Scrolls a schedule card into view once it is on screen.
  function scrollToSchedule(id: string) {
    setTimeout(() => {
      document.getElementById(`schedule-${id}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
    }, 60)
  }

  // Opens a schedule linked from search: plans with items expand in place, anything else opens its image.
  useEffect(() => {
    if (!itemParam || loading || viewer || schedules.length === 0 || openedItemRef.current === itemParam) return
    const match = schedules.find(s => s.id === itemParam)
    if (!match || match.module_id !== activeModule) return
    openedItemRef.current = itemParam
    if (match.type !== activeType) setActiveType(match.type)
    scrollToSchedule(match.id)
    const isPlan = match.type === 'study' && (match.items?.length ?? 0) > 0
    if (!isPlan) openSchedule(match)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemParam, schedules, loading])

  // Opens a schedule's image (needs a connection); schedules without an image do nothing.
  function openSchedule(sch: ScheduleRow) {
    if (!sch.url) return
    if (!navigator.onLine) {
      showToast("Schedule images need a connection — try again when you're online", 'info')
      return
    }
    setViewer(sch)
  }

  // Only the selected module's schedules are shown, so a failed load never leaks another module's rows.
  const filtered = schedules.filter(s => s.module_id === activeModule && s.type === activeType)
  const visible = activeType === 'exam' ? [...filtered].sort((a, b) => examSortKey(a) - examSortKey(b)) : filtered
  const hoverTint = glassHoverTint(dark)

  return (
    <PageShell dark={dark} backFallback="/" maxWidth={900}>
      {(loadError || modulesError) && <ErrorBanner />}
      {savedCopy && <OfflineNote dark={dark} message="You're offline — showing the last saved schedules." />}

      {viewer && viewer.url && (
        <MediaOverlay
          dark={dark}
          onClose={() => setViewer(null)}
          src={getDriveOrRawUrl(viewer.url)}
          title={viewer.title}
          fileType="image"
        />
      )}

      <PageIntro dark={dark} emoji={<ScheduleIcon color={ON_GRADIENT_TOP.primary} size={40} />} title="Schedules" subtitle="Study plans and exam dates, module by module" />

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: SECTION_GAP }}>
        <TabRow
          items={selectableModules.map(m => ({ value: m.id, label: m.name, icon: m.icon, color: m.color, completed: m.status === 'completed' }))}
          active={activeModule}
          onSelect={setActiveModule}
          dark={dark}
          style={{ justifyContent: 'center', flexWrap: 'wrap', overflowX: 'visible', marginBottom: 0, rowGap: 10 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: SECTION_GAP }}>
        {(['study', 'exam'] as ScheduleType[]).map(type => {
          const active = activeType === type
          const color = active ? (dark ? '#ffffff' : '#062B50') : pt.sub
          return (
            <PulseGlassRow
              key={type}
              dark={dark}
              radius={999}
              active={active}
              activeTint={`${pt.cobalt}26`}
              hoverTint={hoverTint}
              onClick={() => setActiveType(type)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveType(type) } }}
              aria-label={type === 'study' ? 'Study Planner' : 'Exam Schedule'}
            >
              <div style={{
                padding: '10px 20px', whiteSpace: 'nowrap',
                ...pulseType.button, color, display: 'flex', alignItems: 'center', gap: 8
              }}>
                {type === 'study' ? <ScheduleIcon color={color} size={15} /> : <ExamIcon color={color} size={15} />}
                {type === 'study' ? 'Study Planner' : 'Exam Schedule'}
              </div>
            </PulseGlassRow>
          )
        })}
      </div>

      {!modulesLoaded || loading ? (
        <ScheduleSkeleton />
      ) : visible.length === 0 ? (
        !loadError && (
          <EmptyState
            dark={dark}
            icon={<EmptyBoxIcon color={pt.sub} size={16} />}
            message={activeType === 'study' ? 'No study plans yet' : 'No exams scheduled yet'}
          />
        )
      ) : (
        <div>
          {visible.map((sch, i) => (
            <div
              key={sch.id}
              id={`schedule-${sch.id}`}
              style={{ marginBottom: i === visible.length - 1 ? 0 : TASK_GAP, scrollMarginTop: SCROLL_OFFSET }}
            >
              {sch.type === 'exam' ? (
                <ExamScheduleCard dark={dark} schedule={sch} accent={SCHEDULE_ACCENT} delay={i * 90} onViewImage={() => openSchedule(sch)} />
              ) : (
                <StudyPlanCard
                  dark={dark}
                  schedule={sch}
                  accent={SCHEDULE_ACCENT}
                  delay={i * 90}
                  defaultOpen={i === 0 || sch.id === itemParam}
                  onViewImage={() => openSchedule(sch)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
