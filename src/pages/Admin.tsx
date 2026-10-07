import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth, useModules } from '../contexts'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import PulseGlassRow from '../components/pulse/PulseGlassRow'
import BackButton from '../components/pulse/BackButton'
import ErrorBanner from '../components/ErrorBanner'
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
import AdminContextBar from './admin/AdminContextBar'
import { useAdminContext } from './admin/useAdminContext'
import { LIST_LIMIT } from './admin/adminStyles'
import type { AdminModule, AdminSubject, AdminLesson } from './admin/adminTypes'

type TabIcon = (p: { color: string; size?: number }) => JSX.Element

const SECTIONS = [
  { id: 'content', label: 'Content', Icon: FolderIcon, tabs: ['questions', 'files', 'summaries', 'schedules'] },
  { id: 'structure', label: 'Structure', Icon: PackageIcon, tabs: ['modules', 'subjects', 'lessons', 'stages'] },
  { id: 'site', label: 'Site', Icon: GearIcon, tabs: ['analytics', 'settings'] }
] as const

type AdminTab = typeof SECTIONS[number]['tabs'][number]

const TAB_META: Record<AdminTab, { Icon: TabIcon; label: string }> = {
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

const CONTEXT_DEPTH: Partial<Record<AdminTab, number>> = {
  subjects: 1,
  schedules: 1,
  lessons: 2,
  files: 3,
  questions: 3,
  summaries: 3
}

interface AdminPillProps {
  dark: boolean
  active: boolean
  label: string
  Icon: TabIcon
  onSelect: () => void
}

function AdminPill({ dark, active, label, Icon, onSelect }: AdminPillProps) {
  const pt = getPulseTheme(dark)
  return (
    <PulseGlassRow
      dark={dark} radius={999} active={active}
      activeTint={`${pt.cobalt}26`}
      hoverTint={dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'}
      onClick={onSelect} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      style={{ flexShrink: 0 }}
    >
      <div style={{ padding: '9px 16px', whiteSpace: 'nowrap', ...pulseType.button, color: active ? pt.cobalt : pt.sub, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon color={active ? pt.cobalt : pt.sub} size={14} /> {label}
      </div>
    </PulseGlassRow>
  )
}

interface AdminProps {
  dark: boolean
}

export default function Admin({ dark }: AdminProps) {
  const { profile, authLoaded } = useAuth() as { profile?: { role?: string } | null; authLoaded: boolean }
  const { refreshModules } = useModules() as { refreshModules: () => Promise<{ modules: AdminModule[]; error?: any }> }
  const isAuth = profile?.role === 'admin'
  const pt = getPulseTheme(dark)

  const [activeTab, setActiveTab] = useState<AdminTab>('questions')

  const [modules, setModules] = useState<AdminModule[]>([])
  const [subjects, setSubjects] = useState<AdminSubject[]>([])
  const [lessons, setLessons] = useState<AdminLesson[]>([])

  const [refDataLoading, setRefDataLoading] = useState(true)
  const [refDataError, setRefDataError] = useState(false)

  const context = useAdminContext(modules, subjects, lessons)

  useEffect(() => {
    if (isAuth) {
      setRefDataLoading(true)
      setRefDataError(false)
      Promise.all([fetchModules(), fetchSubjects(), fetchLessons()]).finally(() => setRefDataLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth])

  async function fetchModules() {
    const result = await refreshModules()
    setModules((result?.modules || []) as AdminModule[])
    if (result?.error) setRefDataError(true)
  }
  async function fetchSubjects() {
    invalidateSubjectsCache()
    const { data, error } = await supabase.from('subjects').select('*').order('created_at')
    if (data) setSubjects(data as AdminSubject[])
    if (error) setRefDataError(true)
  }
  async function fetchLessons() {
    invalidateLessonsCache()
    const { data, error } = await supabase.from('lessons').select('*').order('created_at', { ascending: false }).limit(LIST_LIMIT)
    if (data) setLessons(data as AdminLesson[])
    if (error) setRefDataError(true)
  }

  if (!authLoaded) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'relative', zIndex: 1, height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: ON_GRADIENT_TOP.secondary, fontSize: 14, fontWeight: 600 }}>Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAuth) return <NotFound dark={dark} />

  const activeSection = SECTIONS.find(s => (s.tabs as readonly AdminTab[]).includes(activeTab)) ?? SECTIONS[0]
  const sectionTabs: readonly AdminTab[] = activeSection.tabs
  const contextDepth = CONTEXT_DEPTH[activeTab]

  const tabProps = { dark, modules, subjects, lessons, context, fetchModules, fetchSubjects, fetchLessons, refDataLoading }

  return (
    <div style={{ position: 'relative' }}>
      <div className="pulse-wide admin-shell" style={{
        position: 'relative', zIndex: 1,
        padding: '4px 20px 100px',
        fontFamily: pulseFonts.body, maxWidth: 1500, margin: '0 auto'
      }}>
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px 0 16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0, position: 'relative', top: -10 }}>
            <GearIcon color={pt.text} size={24} />
          </span>
          <h1 style={{ ...pulseType.miniPageTitle, fontSize: 20, color: pt.text, lineHeight: '24px' }}>Admin Panel</h1>
        </div>

        {refDataError && (
          <div style={{ marginBottom: 16 }}>
            <ErrorBanner message="Couldn't load some admin data — check your connection and try again." />
          </div>
        )}

        <div className="admin-tabs" style={{ marginBottom: 4 }}>
          {SECTIONS.map(section => (
            <AdminPill
              key={section.id} dark={dark}
              active={section.id === activeSection.id}
              label={section.label} Icon={section.Icon}
              onSelect={() => { if (section.id !== activeSection.id) setActiveTab(section.tabs[0]) }}
            />
          ))}
        </div>

        <div className="admin-tabs">
          {sectionTabs.map(t => (
            <AdminPill
              key={t} dark={dark}
              active={activeTab === t}
              label={TAB_META[t].label} Icon={TAB_META[t].Icon}
              onSelect={() => setActiveTab(t)}
            />
          ))}
        </div>

        {contextDepth && (
          <AdminContextBar
            dark={dark} modules={modules} subjects={subjects} lessons={lessons}
            context={context} depth={contextDepth}
          />
        )}

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
