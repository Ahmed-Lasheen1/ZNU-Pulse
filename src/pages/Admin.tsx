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
import { PackageIcon, FolderIcon, CalendarDotIcon, QuestionMarkIcon, ChartBarIcon, GearIcon } from '../components/ui/tool-icons'
import { NotesIcon } from '../lib/medicalIcons'

import QuestionsTab from './admin/QuestionsTab'
import FilesTab from './admin/FilesTab'
import SummariesTab from './admin/SummariesTab'
import SchedulesTab from './admin/SchedulesTab'
import StructureTab from './admin/StructureTab'
import AnalyticsTab from './admin/AnalyticsTab'
import SettingsTab from './admin/SettingsTab'
import AdminContextBar from './admin/AdminContextBar'
import { useAdminContext } from './admin/useAdminContext'
import { LIST_LIMIT } from './admin/adminStyles'
import type { AdminModule, AdminSubject, AdminLesson, AdminIcon } from './admin/adminTypes'

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

interface AdminPillProps {
  dark: boolean
  active: boolean
  label: string
  Icon: AdminIcon
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
            dark={dark} modules={modules} subjects={subjects} lessons={lessons}
            loading={refDataLoading} refresh={refreshStructure}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsTab dark={dark} modules={modules} />}
        {activeTab === 'settings' && <SettingsTab dark={dark} />}
      </div>
    </div>
  )
}
