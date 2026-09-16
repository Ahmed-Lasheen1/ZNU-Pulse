// src/pages/Admin.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth, useModules } from '../contexts'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import PulseBackground from '../components/pulse/PulseBackground'
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
import { LIST_LIMIT } from './admin/adminStyles'
import type { AdminModule, AdminSubject, AdminLesson } from './admin/adminTypes'

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
  const { refreshModules } = useModules() as { refreshModules: () => Promise<{ modules: AdminModule[]; error?: any }> }
  const isAuth = profile?.role === 'admin'
  const pt = getPulseTheme(dark)

  const [activeTab, setActiveTab] = useState<AdminTab>('modules')

  const [modules, setModules] = useState<AdminModule[]>([])
  const [subjects, setSubjects] = useState<AdminSubject[]>([])
  const [lessons, setLessons] = useState<AdminLesson[]>([])

  const [refDataLoading, setRefDataLoading] = useState(true)
  const [refDataError, setRefDataError] = useState(false)

  useEffect(() => {
    if (isAuth) {
      setRefDataLoading(true)
      setRefDataError(false)
      Promise.all([fetchModules(), fetchSubjects(), fetchLessons()]).finally(() => setRefDataLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth])

  // Reuses ModulesContext's own fetch instead of querying modules twice.
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
      <div style={{ position: 'relative', minHeight: '100dvh' }}>
        <PulseBackground />
        <div style={{ position: 'relative', zIndex: 1, height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: ON_GRADIENT_TOP.secondary, fontSize: 14, fontWeight: 600 }}>Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAuth) return <NotFound dark={dark} />

  const tabProps = { dark, modules, subjects, lessons, fetchModules, fetchSubjects, fetchLessons, refDataLoading }

  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <PulseBackground />
      <div className="pulse-wide admin-shell" style={{
        position: 'relative', zIndex: 1,
        // AUDIT FIX (iOS safe area): see PageShell.tsx for the same
        // reasoning — Admin doesn't use PageShell, so its own bottom
        // padding needs the same treatment to keep the last row of
        // whichever tab is open clear of a transparent bottom bar.
        padding: '4px 20px calc(100px + env(safe-area-inset-bottom))',
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
