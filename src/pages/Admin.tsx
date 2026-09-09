import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth, useModules } from '../contexts'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import PulseBackground from '../components/pulse/PulseBackground'
import PulseGlassRow from '../components/pulse/PulseGlassRow'
import BackButton from '../components/pulse/BackButton'
import { fetchModulesSorted } from '../lib/modules'
import { invalidateSubjectsCache } from '../lib/subjects'
import { invalidateLessonsCache } from '../lib/lessons'
import NotFound from './NotFound'
import { PackageIcon, BookIcon, FolderIcon, CalendarDotIcon, QuestionMarkIcon, ChartBarIcon, GearIcon, TargetIcon } from '../components/ui/tool-icons'
import { NotesIcon } from '../lib/medicalIcons'

import ModulesTab from './admin/ModulesTab'
import SubjectsTab from './admin/SubjectsTab'
import LessonsTab from './admin/LessonsTab'
import FilesTab from './admin/FilesTab'
import SchedulesTab from './admin/SchedulesTab'
import QuestionsTab from './admin/QuestionsTab'
import SummariesTab from './admin/SummariesTab'
import StagesTab from './admin/StagesTab'
import AnalyticsTab from './admin/AnalyticsTab'
import SettingsTab from './admin/SettingsTab'
import type { AdminModule, AdminSubject, AdminLesson } from './admin/adminTypes'

// Cap on the lessons list fetched here for cross-tab use — matches
// LIST_LIMIT in admin/adminStyles.ts.
const LESSONS_LIST_LIMIT = 200

const TABS = ['modules', 'subjects', 'lessons', 'files', 'schedules', 'questions', 'summaries', 'stages', 'analytics', 'settings'] as const
type AdminTab = typeof TABS[number]

const TAB_META: Record<AdminTab, { Icon: (p: { color: string; size?: number }) => JSX.Element; label: string }> = {
  modules: { Icon: PackageIcon, label: 'Modules' },
  subjects: { Icon: BookIcon, label: 'Subjects' },
  lessons: { Icon: BookIcon, label: 'Lessons' },
  files: { Icon: FolderIcon, label: 'Files' },
  schedules: { Icon: CalendarDotIcon, label: 'Schedules' },
  questions: { Icon: QuestionMarkIcon, label: 'Questions' },
  summaries: { Icon: NotesIcon, label: 'Summaries' },
  stages: { Icon: TargetIcon, label: 'Stages' },
  analytics: { Icon: ChartBarIcon, label: 'Analytics' },
  settings: { Icon: GearIcon, label: 'Settings' }
}

interface AdminProps {
  dark: boolean
}

export default function Admin({ dark }: AdminProps) {
  const { profile, authLoaded } = useAuth() as { profile?: { role?: string } | null; authLoaded: boolean }
  const { refreshModules } = useModules() as { refreshModules: () => void }
  const isAuth = profile?.role === 'admin'
  const pt = getPulseTheme(dark)

  const [activeTab, setActiveTab] = useState<AdminTab>('modules')

  // Reference data shared by several tabs (ModuleSelect dropdowns,
  // grouping lists by module/subject). Fetched once here and handed
  // down as props + refetch callbacks.
  const [modules, setModules] = useState<AdminModule[]>([])
  const [subjects, setSubjects] = useState<AdminSubject[]>([])
  const [lessons, setLessons] = useState<AdminLesson[]>([])

  // AUDIT FIX (performance audit — loading states): previously there
  // was no flag distinguishing "haven't fetched yet" from "fetched,
  // genuinely empty". Every reference-data tab (Modules/Subjects/
  // Lessons) rendered its own list straight off `modules`/`subjects`/
  // `lessons`, which all start as `[]` — so on every single Admin
  // visit, for the brief window between mount and the fetch actually
  // resolving, each tab would flash its real "No modules yet — add
  // one on the left" empty state before the true data arrived. This
  // tracks the INITIAL load only (not every subsequent refetch a tab
  // triggers after a save, which should feel instant / not re-show a
  // loading state), so it's set once per Admin mount via Promise.all
  // over the three initial fetches.
  const [refDataLoading, setRefDataLoading] = useState(true)

  useEffect(() => {
    if (isAuth) {
      setRefDataLoading(true)
      Promise.all([fetchModules(), fetchSubjects(), fetchLessons()]).finally(() => setRefDataLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth])

  async function fetchModules() {
    const { modules: sorted } = await fetchModulesSorted()
    setModules(sorted as AdminModule[])
    refreshModules()
  }
  async function fetchSubjects() {
    invalidateSubjectsCache()
    const { data } = await supabase.from('subjects').select('*').order('created_at')
    if (data) setSubjects(data as AdminSubject[])
  }
  async function fetchLessons() {
    invalidateLessonsCache()
    const { data } = await supabase.from('lessons').select('*').order('created_at', { ascending: false }).limit(LESSONS_LIST_LIMIT)
    if (data) setLessons(data as AdminLesson[])
  }

  // Security-through-obscurity note (unchanged): this only hides that
  // an admin panel exists from casual visitors — real protection is
  // Supabase RLS. While auth is still loading, show a blank state
  // instead of flashing 404 for a moment on every visit (including
  // the real admin's own) before we actually know if this person is
  // signed in and what their role is.
  if (!authLoaded) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <PulseBackground />
        <div style={{ position: 'relative', zIndex: 1, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: ON_GRADIENT_TOP.secondary, fontSize: 14, fontWeight: 600 }}>Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAuth) return <NotFound dark={dark} />

  const tabProps = { dark, modules, subjects, lessons, fetchModules, fetchSubjects, fetchLessons, refDataLoading }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      {/* AUDIT FIX: the sidebar-nav experiment traded away the
          familiar top tab strip and, combined with the old 48px
          title padding, left a lot of dead space between the site
          header and any actual content. Tabs are back on top (a
          single wrapping row on desktop, horizontal-scroll on
          mobile — unchanged from the original), and every spacing
          value between the fixed header and the tab row has been
          trimmed down so content starts right away instead of after
          a big empty gap. */}
      <div className="pulse-wide admin-shell" style={{ position: 'relative', zIndex: 1, padding: '4px 20px 100px', fontFamily: pulseFonts.body, maxWidth: 1500, margin: '0 auto' }}>
        <style>{`
          .admin-tabs {
            display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px;
            margin-bottom: 16px; -webkit-overflow-scrolling: touch;
          }
          @media (min-width: 720px) {
            .admin-tabs { flex-wrap: wrap; overflow-x: visible; }
          }
          .admin-form-row-2 {
            display: grid; grid-template-columns: 1fr; gap: 0; margin-bottom: 12px;
          }
          @media (min-width: 640px) {
            .admin-form-row-2 { grid-template-columns: 1fr 1fr; gap: 12px; }
          }
        `}</style>

        <div style={{ marginBottom: 4 }}>
          <BackButton dark={dark} fallback="/" />
        </div>

        {/* AUDIT FIX: GearIcon (an inline <svg>, a "replaced" element
            like <img>) was drifting a couple pixels below the <h1>'s
            visual center in this flex row — browsers baseline-align
            inline replaced elements against surrounding text metrics
            even inside `align-items: center` once the h1's line-height
            multiplier doesn't cleanly match the icon's own box height.
            Wrapping the icon in its own `inline-flex` span (with
            `lineHeight: 0` to strip any residual inline box padding)
            and pinning the h1's line-height to match the icon's pixel
            size removes the ambiguity entirely, so the two are
            genuinely centered on the same axis instead of relying on
            font-metric coincidence. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px 0 16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0, position: 'relative', top: -5 }}>
            <GearIcon color={pt.text} size={24} />
          </span>
          <h1 style={{ ...pulseType.miniPageTitle, fontSize: 20, color: pt.text, lineHeight: '24px' }}>Admin Panel</h1>
        </div>

        <div className="admin-tabs">
          {TABS.map(t => {
            const active = activeTab === t
            const { Icon, label } = TAB_META[t]
            return (
              <PulseGlassRow
                key={t} dark={dark} radius={999} active={active}
                activeTint={`${pt.cobalt}26`}
                hoverTint={dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'}
                onClick={() => setActiveTab(t)} role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab(t) } }}
                style={{ flexShrink: 0 }}
              >
                <div style={{ padding: '9px 16px', whiteSpace: 'nowrap', ...pulseType.button, color: active ? pt.cobalt : pt.sub, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon color={active ? pt.cobalt : pt.sub} size={14} /> {label}
                </div>
              </PulseGlassRow>
            )
          })}
        </div>

        {activeTab === 'modules' && <ModulesTab {...tabProps} />}
        {activeTab === 'subjects' && <SubjectsTab {...tabProps} />}
        {activeTab === 'lessons' && <LessonsTab {...tabProps} />}
        {activeTab === 'files' && <FilesTab {...tabProps} />}
        {activeTab === 'schedules' && <SchedulesTab {...tabProps} />}
        {activeTab === 'questions' && <QuestionsTab {...tabProps} />}
        {activeTab === 'summaries' && <SummariesTab {...tabProps} />}
        {activeTab === 'stages' && <StagesTab {...tabProps} />}
        {activeTab === 'analytics' && <AnalyticsTab {...tabProps} />}
        {activeTab === 'settings' && <SettingsTab {...tabProps} />}
      </div>
    </div>
  )
}
