import { useState, useEffect } from 'react'
import { supabase } from '@/core/supabase'
import { useAuth, useModules } from '@/core/contexts'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '@/shared/theme/premiumTheme'
import BackButton from '@/shared/ui/layout/BackButton'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import { invalidateSubjectsCache } from '@/services/content/subjects'
import { invalidateLessonsCache } from '@/services/content/lessons'
import { fetchAllRows } from '@/core/fetchAllRows'
import NotFound from '@/shared/ui/feedback/NotFound'
import { PackageIcon, FolderIcon, CalendarDotIcon, QuestionMarkIcon, ChartBarIcon, GearIcon } from '@/shared/icons/tool-icons'
import { NotesIcon } from '@/shared/icons/medicalIcons'

import QuestionsTab from '@/features/admin/content/QuestionsTab'
import FilesTab from '@/features/admin/content/FilesTab'
import SummariesTab from '@/features/admin/content/SummariesTab'
import SchedulesTab from '@/features/admin/content/SchedulesTab'
import StructureTab from '@/features/admin/structure/StructureTab'
import AnalyticsTab from '@/features/admin/analytics/AnalyticsTab'
import SettingsTab from '@/features/admin/settings/SettingsTab'
import AdminContextBar from '@/features/admin/common/AdminContextBar'
import AdminPill from '@/features/admin/common/AdminPill'
import { useAdminContext } from '@/features/admin/common/useAdminContext'
import type { AdminModule, AdminSubject, AdminLesson } from '@/features/admin/common/adminTypes'

const TABS = [
  { id: 'structure', label: 'Structure', Icon: PackageIcon },
  { id: 'summaries', label: 'Summaries', Icon: NotesIcon },
  { id: 'questions', label: 'Questions', Icon: QuestionMarkIcon },
  { id: 'files', label: 'Files', Icon: FolderIcon },
  { id: 'schedules', label: 'Schedules', Icon: CalendarDotIcon },
  { id: 'settings', label: 'Settings', Icon: GearIcon },
  { id: 'analytics', label: 'Analytics', Icon: ChartBarIcon },
] as const

type AdminTab = typeof TABS[number]['id']

const CONTEXT_DEPTH: Partial<Record<AdminTab, number>> = {
  schedules: 1,
  files: 3,
  questions: 3,
  summaries: 3,
}

export default function Admin({ dark }: { dark: boolean }) {
  const { profile, authLoaded } = useAuth() as { profile?: { role?: string } | null; authLoaded: boolean }
  const { refreshModules } = useModules() as { refreshModules: () => Promise<{ modules: AdminModule[]; error?: any }> }
  const isAdmin = profile?.role === 'admin'
  const pt = getPulseTheme(dark)

  const [activeTab, setActiveTab] = useState<AdminTab>('questions')
  const [modules, setModules] = useState<AdminModule[]>([])
  const [subjects, setSubjects] = useState<AdminSubject[]>([])
  const [lessons, setLessons] = useState<AdminLesson[]>([])
  const [refDataLoading, setRefDataLoading] = useState(true)
  const [refDataError, setRefDataError] = useState(false)

  const context = useAdminContext(modules, subjects, lessons)

  async function fetchModules() {
    const result = await refreshModules()
    setModules((result?.modules || []) as AdminModule[])
    if (result?.error) setRefDataError(true)
  }

  async function fetchSubjects() {
    invalidateSubjectsCache()
    const { data, error } = await fetchAllRows(() => supabase.from('subjects').select('*').order('created_at').order('id'))
    if (data) setSubjects(data as AdminSubject[])
    if (error) setRefDataError(true)
  }

  async function fetchLessons() {
    invalidateLessonsCache()
    const { data, error } = await fetchAllRows(() => supabase.from('lessons').select('*').order('created_at').order('id'))
    if (data) setLessons(data as AdminLesson[])
    if (error) setRefDataError(true)
  }

  async function refreshStructure() {
    setRefDataError(false)
    await Promise.all([fetchModules(), fetchSubjects(), fetchLessons()])
  }

  useEffect(() => {
    if (!isAdmin) return
    setRefDataLoading(true)
    refreshStructure().finally(() => setRefDataLoading(false))
  }, [isAdmin])

  if (!authLoaded) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'relative', zIndex: 1, height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: ON_GRADIENT_TOP.secondary, fontSize: 14, fontWeight: 600 }}>Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAdmin) return <NotFound dark={dark} />

  const contextDepth = CONTEXT_DEPTH[activeTab]

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
          .admin-form-row-3 {
            display: grid; grid-template-columns: 1fr; gap: 0 10px; margin-bottom: 8px;
          }
          @media (min-width: 560px) {
            .admin-form-row-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          }
          .admin-list-grid {
            display: grid; grid-template-columns: 1fr; gap: 10px;
          }
          @media (min-width: 1500px) {
            .admin-list-grid { grid-template-columns: 1fr 1fr; }
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
          {TABS.map(tab => (
            <AdminPill
              key={tab.id}
              dark={dark}
              active={activeTab === tab.id}
              label={tab.label}
              Icon={tab.Icon}
              onSelect={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {contextDepth && (
          <AdminContextBar
            dark={dark} modules={modules} subjects={subjects} lessons={lessons}
            context={context} depth={contextDepth}
          />
        )}

        {activeTab === 'questions' && <QuestionsTab dark={dark} modules={modules} context={context} />}
        {activeTab === 'files' && <FilesTab dark={dark} modules={modules} context={context} />}
        {activeTab === 'summaries' && <SummariesTab dark={dark} modules={modules} subjects={subjects} context={context} />}
        {activeTab === 'schedules' && <SchedulesTab dark={dark} modules={modules} context={context} />}
        {activeTab === 'structure' && (
          <StructureTab
            dark={dark} modules={modules} subjects={subjects} lessons={lessons} context={context}
            loading={refDataLoading} refresh={refreshStructure}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsTab dark={dark} modules={modules} />}
        {activeTab === 'settings' && <SettingsTab dark={dark} />}
      </div>
    </div>
  )
}
