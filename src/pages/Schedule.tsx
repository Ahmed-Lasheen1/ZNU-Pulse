// src/pages/Schedule.tsx
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import ErrorBanner from '../components/ErrorBanner'
import TabRow from '../components/TabRow'
import MediaOverlay from '../components/MediaOverlay'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../components/pulse/PulseBackground'
import PulseGlassRow from '../components/pulse/PulseGlassRow'
import BackButton from '../components/pulse/BackButton'
import PageIntro from '../components/pulse/PageIntro'
import { getDriveOrRawUrl } from '../lib/embedUrl'
import { useModules } from '../contexts'
import { useHistoryOverlay } from '../lib/useHistoryOverlay'
import { ScheduleIcon, EmptyBoxIcon, SearchIcon2 } from '../components/ui/tool-icons'
import { ExamIcon } from '../lib/medicalIcons'

const SCHEDULE_ACCENT = '#a78bfa'

const SECTION_GAP = 22
const TASK_GAP = 16

interface ScheduleModule {
  id: string
  name: string
  icon?: string | null
  color: string
  status: 'active' | 'completed'
}

interface ScheduleRow {
  id: string
  title: string
  week?: string | null
  // AUDIT FIX (multi-date support): an exam schedule item can now
  // carry more than one date (e.g. a full staged exam schedule for a
  // module) instead of just one — see the `schedules_add_dates_array`
  // migration and admin/SchedulesTab.tsx.
  dates?: string[] | null
  url: string
  type: 'study' | 'exam'
  module_id: string
}

type ScheduleType = 'study' | 'exam'

export default function Schedule({ dark }: { dark: boolean }) {
  const pt = getPulseTheme(dark)
  const location = useLocation()
  const { modules, modulesLoaded, modulesError } = useModules() as {
    modules: ScheduleModule[]
    modulesLoaded: boolean
    modulesError: boolean
  }
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [activeModule, setActiveModule] = useState<string | null>(null)

  // AUDIT FIX (search accuracy): Search.tsx now links here with
  // `?module=<id>&type=<study|exam>&item=<id>` so a schedule search
  // result opens the exact matching item instead of dropping the
  // person on the default (first active module, Study tab) view.
  const params = new URLSearchParams(location.search)
  const moduleParam = params.get('module')
  const typeParam = params.get('type')
  const itemParam = params.get('item')

  const [activeType, setActiveType] = useState<ScheduleType>(() => (typeParam === 'exam' ? 'exam' : 'study'))
  const [loading, setLoading] = useState(true)
  const [viewer, setViewer] = useState<ScheduleRow | null>(null)
  const [loadError, setLoadError] = useState(false)

  useHistoryOverlay(!!viewer, () => setViewer(null))

  const activeModules = modules.filter(m => m.status === 'active')

  useEffect(() => {
    if (activeModule) return
    if (moduleParam && modules.some(m => m.id === moduleParam)) {
      setActiveModule(moduleParam)
      return
    }
    if (modulesLoaded && activeModules.length > 0) {
      setActiveModule(activeModules[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesLoaded, modules, moduleParam])

  useEffect(() => {
    let ignore = false
    async function fetchData() {
      setLoading(true)
      const { data, error } = await supabase.from('schedules').select('*').order('created_at')
      if (ignore) return
      if (data) setSchedules(data as ScheduleRow[])
      if (error) setLoadError(true)
      setLoading(false)
    }
    fetchData()
    return () => { ignore = true }
  }, [])

  // Opens the exact schedule item a Search result pointed at, once
  // the full list has loaded. Guarded on `viewer` being empty so it
  // never fights with the person manually closing it afterward.
  useEffect(() => {
    if (!itemParam || viewer || schedules.length === 0) return
    const match = schedules.find(s => s.id === itemParam)
    if (match) setViewer(match)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemParam, schedules])

  const filtered = schedules.filter(s => s.module_id === activeModule && s.type === activeType)
  const hoverTint = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>

        <div style={{ marginBottom: 8 }}>
          <BackButton dark={dark} fallback="/" />
        </div>

        {(loadError || modulesError) && <ErrorBanner />}

        {viewer && (
          <MediaOverlay
            dark={dark}
            onClose={() => setViewer(null)}
            src={getDriveOrRawUrl(viewer.url)}
            iframeTitle={viewer.title}
            allow="autoplay" allowFullScreen={undefined}
          />
        )}

        <PageIntro dark={dark} emoji={<ScheduleIcon color={ON_GRADIENT_TOP.primary} size={40} />} title="Schedules" subtitle="Study plans and exam dates, module by module" />

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: SECTION_GAP }}>
          <TabRow
            items={activeModules.map(m => ({ value: m.id, label: m.name, icon: m.icon, color: m.color, completed: m.status === 'completed' }))}
            active={activeModule}
            onSelect={setActiveModule}
            dark={dark}
            style={{ justifyContent: 'center', flexWrap: 'wrap', overflowX: 'visible', marginBottom: 0, rowGap: 10 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: SECTION_GAP }}>
          {(['study', 'exam'] as ScheduleType[]).map(type => {
            const active = activeType === type
            // AUDIT FIX: matches the active-tab text color used by
            // Profile's Profile/Leaderboard tabs (see Profile.tsx)
            // instead of the Liquid Glass pt.cobalt token, so these
            // two pill rows read consistently across the app.
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
                aria-label={type === 'study' ? 'Study Schedule' : 'Exam Schedule'}
              >
                <div style={{
                  padding: '10px 20px', whiteSpace: 'nowrap',
                  ...pulseType.button, color, display: 'flex', alignItems: 'center', gap: 8
                }}>
                  {type === 'study' ? <ScheduleIcon color={color} size={15} /> : <ExamIcon color={color} size={15} />}
                  {type === 'study' ? 'Study Schedule' : 'Exam Schedule'}
                </div>
              </PulseGlassRow>
            )
          })}
        </div>

        {!modulesLoaded || loading ? (
          <p style={{ color: ON_GRADIENT_TOP.secondary, textAlign: 'center' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <EmptyBoxIcon color={pt.sub} size={16} /> No schedules yet
            </p>
          </LiquidGlassCard>
        ) : (
          <div>
            {filtered.map((sch, i) => {
              const isLast = i === filtered.length - 1
              const sortedDates = sch.dates && sch.dates.length > 0 ? [...sch.dates].sort() : []
              return (
                <div key={sch.id} style={{ marginBottom: isLast ? 0 : TASK_GAP }}>
                  <LiquidGlassCard
                    dark={dark}
                    delay={i * 90}
                    onClick={() => setViewer(sch)}
                    style={{ borderRadius: 999, padding: '10px 18px 10px 10px', display: 'flex', alignItems: 'center', gap: 14 }}
                  >
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                      background: `${SCHEDULE_ACCENT}22`, border: `1px solid ${SCHEDULE_ACCENT}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {sch.type === 'exam' ? <ExamIcon color={SCHEDULE_ACCENT} size={20} /> : <ScheduleIcon color={SCHEDULE_ACCENT} size={20} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...pulseType.cardTitle, color: pt.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sch.title}
                      </div>
                      <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>
                        {sch.week ? sch.week : null}
                        {sortedDates.length > 0 && (
                          <span style={{ color: SCHEDULE_ACCENT, fontWeight: 700 }}>
                            {sch.week ? ' · ' : ''}
                            {sortedDates.map(d => new Date(d).toLocaleDateString()).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      background: SCHEDULE_ACCENT, color: '#0f172a',
                      borderRadius: 10, padding: '8px 14px',
                      fontWeight: 700, fontSize: 12, flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 6
                    }}>
                      <SearchIcon2 color="#0f172a" size={13} /> View
                    </div>
                  </LiquidGlassCard>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
