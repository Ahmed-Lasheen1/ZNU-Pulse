// src/pages/FilesPage.tsx
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import { useModules } from '../contexts'
import ErrorBanner from '../components/ErrorBanner'
import TabRow from '../components/TabRow'
import MediaOverlay from '../components/MediaOverlay'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../components/pulse/PulseBackground'
import BackButton from '../components/pulse/BackButton'
import PageIntro from '../components/pulse/PageIntro'
import { useHistoryOverlay } from '../lib/useHistoryOverlay'
import { fetchSubjectsForModule } from '../lib/subjects'
import { getDriveOrRawUrl, getVideoEmbedUrl } from '../lib/embedUrl'
import { BookIcon, QuestionMarkIcon, VideoIcon, GraduationCapIcon, DocumentIcon, AudioIcon, FolderIcon, PlayIcon } from '../components/ui/tool-icons'

interface FilesModule {
  id: string
  name: string
  icon?: string | null
  color: string
  status: 'active' | 'completed'
}

interface FileRow {
  id: string
  name: string
  url: string
  type: string
  file_type: 'pdf' | 'video' | 'audio'
  module_id: string
  subject_id?: string | null
}

interface FilesSubject {
  id: string
  module_id: string
  name: string
}

const FILE_ACCENT = '#38bdf8'

// Icon + label for a given file_type value ('pdf' | 'video' | 'audio')
// — replaces the old emoji-string getFileIcon/getOpenLabel helpers.
function fileTypeIcon(type: string, color: string, size = 20) {
  if (type === 'video') return <VideoIcon color={color} size={size} />
  if (type === 'audio') return <AudioIcon color={color} size={size} />
  return <DocumentIcon color={color} size={size} />
}
function openActionIcon(type: string, color: string, size = 12) {
  if (type === 'video') return <PlayIcon color={color} size={size} />
  if (type === 'audio') return <AudioIcon color={color} size={size} />
  return <DocumentIcon color={color} size={size} />
}
function openActionLabel(type: string) {
  return type === 'video' ? 'Play' : type === 'audio' ? 'Listen' : 'Open'
}

const TYPE_META: Record<string, { Icon: (p: { color?: string; size?: number }) => JSX.Element; label: string }> = {
  sharah: { Icon: BookIcon, label: 'Explanation Files' },
  questions: { Icon: QuestionMarkIcon, label: 'Question Files' },
  lectures: { Icon: VideoIcon, label: 'Lecture Recordings' },
  courses: { Icon: GraduationCapIcon, label: 'Course Recordings' },
}

function AudioViewer({ url, name, onClose, dark }: { url: string; name: string; onClose: () => void; dark: boolean }) {
  const pt = getPulseTheme(dark)
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ width: '90%', maxWidth: 400 }}>
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <AudioIcon color={FILE_ACCENT} size={48} />
          </div>
          <h3 style={{ ...pulseType.sectionTitle, color: FILE_ACCENT, marginBottom: 20 }}>{name}</h3>
          <audio controls src={url} style={{ width: '100%', marginBottom: 20 }} />
          <button onClick={onClose} style={{
            background: pt.danger, color: '#fff', border: 'none', borderRadius: 999,
            padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontFamily: pulseFonts.body
          }}>✕ Close</button>
        </LiquidGlassCard>
      </div>
    </div>
  )
}

export default function FilesPage({ dark }: { dark: boolean }) {
  const pt = getPulseTheme(dark)
  const [files, setFiles] = useState<FileRow[]>([])
  const { modules, modulesLoaded, modulesError } = useModules() as {
    modules: FilesModule[]; modulesLoaded: boolean; modulesError: boolean
  }
  // AUDIT FIX (performance audit — genuinely redundant request): this
  // used to be `const [subjects, setSubjects] = useState<FilesSubject[]>([])`
  // populated by a raw, uncached `supabase.from('subjects').select('*')`
  // inside the SAME effect as the files fetch, keyed on `[fileType]` —
  // so switching between Explanation/Question/Lecture/Course files
  // (which only ever changes `fileType`, never which subjects exist)
  // re-fetched the ENTIRE subjects table every single time. Every
  // other page that needs subjects (ModulePage, StagePage, MCQ) goes
  // through the shared in-memory cache in src/lib/subjects.js
  // instead. This now does the same: `moduleSubjects` is fetched via
  // `fetchSubjectsForModule`, which loads the whole subjects table
  // ONCE per browser tab (cached, in-flight-deduped) no matter how
  // many times this effect re-runs, and is keyed on `[activeModule]`
  // (the thing it actually depends on) rather than `[fileType]`.
  const [moduleSubjects, setModuleSubjects] = useState<FilesSubject[]>([])
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [activeSubject, setActiveSubject] = useState('all')
  const [loading, setLoading] = useState(true)
  const [viewer, setViewer] = useState<FileRow | null>(null)
  const [loadError, setLoadError] = useState(false)
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const fileType = params.get('type')
  const moduleParam = params.get('module')
  const typeMeta = fileType ? TYPE_META[fileType] : null

  useHistoryOverlay(!!viewer, () => setViewer(null))

  const activeModules = modules.filter(m => m.status === 'active')

  useEffect(() => {
    if (moduleParam) {
      setActiveModule(moduleParam)
    } else if (modulesLoaded && activeModules.length > 0 && !activeModule) {
      setActiveModule(activeModules[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesLoaded, modules, moduleParam])

  // Files — the only thing that actually depends on `fileType`.
  useEffect(() => {
    let ignore = false
    async function fetchFiles() {
      setLoading(true)
      const { data, error } = await supabase.from('files').select('*').eq('type', fileType).order('created_at', { ascending: false })
      if (ignore) return
      if (data) setFiles(data)
      if (error) setLoadError(true)
      setLoading(false)
    }
    fetchFiles()
    return () => { ignore = true }
  }, [fileType])

  // Subjects for the current module — keyed on `activeModule`, not
  // `fileType`, and served from the shared cache instead of a fresh
  // network call every time.
  useEffect(() => {
    let ignore = false
    fetchSubjectsForModule(activeModule || '').then(({ subjects, error }) => {
      if (ignore) return
      setModuleSubjects(subjects)
      if (error) setLoadError(true)
    })
    return () => { ignore = true }
  }, [activeModule])

  const filtered = files.filter(f => {
    const moduleMatch = f.module_id === activeModule
    const subjectMatch = activeSubject === 'all' || f.subject_id === activeSubject
    return moduleMatch && subjectMatch
  })

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>

        <div style={{ marginBottom: 8 }}>
          <BackButton dark={dark} fallback="/" />
        </div>

        {(loadError || modulesError) && <ErrorBanner />}

        {viewer && viewer.file_type === 'pdf' && (
          <MediaOverlay
            dark={dark}
            onClose={() => setViewer(null)}
            src={getDriveOrRawUrl(viewer.url)}
            iframeTitle="PDF Viewer"
            allow="autoplay" allowFullScreen={undefined}
          />
        )}
        {viewer && viewer.file_type === 'video' && (
          <MediaOverlay
            dark={dark}
            onClose={() => setViewer(null)}
            src={getVideoEmbedUrl(viewer.url)}
            iframeTitle="Video Player"
            allowFullScreen allow={undefined}
          />
        )}
        {viewer && viewer.file_type === 'audio' && (
          <AudioViewer url={viewer.url} name={viewer.name} onClose={() => setViewer(null)} dark={dark} />
        )}

        <PageIntro
          dark={dark}
          emoji={typeMeta ? <typeMeta.Icon color={ON_GRADIENT_TOP.primary} size={40} /> : <FolderIcon color={ON_GRADIENT_TOP.primary} size={40} />}
          title={typeMeta ? typeMeta.label : 'Files'}
        />

        <TabRow
          items={activeModules.map(m => ({ value: m.id, label: m.name, icon: m.icon, color: m.color, completed: m.status === 'completed' }))}
          active={activeModule}
          onSelect={(id) => { setActiveModule(id); setActiveSubject('all') }}
          dark={dark}
        />

        {moduleSubjects.length > 0 && (
          <TabRow
            items={[{ value: 'all', label: 'All' }, ...moduleSubjects.map(sub => ({ value: sub.id, label: sub.name }))]}
            active={activeSubject}
            onSelect={setActiveSubject}
            dark={dark}
            accentColor={FILE_ACCENT}
            style={{ marginBottom: 20 }}
          />
        )}

        {loading && <p style={{ color: ON_GRADIENT_TOP.secondary, textAlign: 'center' }}>Loading...</p>}

        {!loading && filtered.length === 0 && (
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: pt.sub }}>No files yet 🚧</p>
          </LiquidGlassCard>
        )}

        {filtered.map((file, i) => {
          const isLast = i === filtered.length - 1
          return (
            <div key={file.id} style={{ marginBottom: isLast ? 0 : 12 }}>
              <LiquidGlassCard dark={dark} delay={i * 70} style={{
                padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <span style={{ flexShrink: 0, display: 'inline-flex' }}>{fileTypeIcon(file.file_type, pt.textPrimary, 22)}</span>
                  <span style={{ ...pulseType.cardTitle, color: pt.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                </div>
                <button onClick={() => setViewer(file)} style={{
                  background: FILE_ACCENT, color: '#0f172a', border: 'none',
                  padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
                  fontWeight: 700, fontSize: 13, fontFamily: pulseFonts.body, whiteSpace: 'nowrap', flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', gap: 6
                }}>
                  {openActionIcon(file.file_type, '#0f172a', 13)} {openActionLabel(file.file_type)}
                </button>
              </LiquidGlassCard>
            </div>
          )
        })}
      </div>
    </div>
  )
}
