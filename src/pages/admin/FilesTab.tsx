import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import ErrorBanner from '../../components/ErrorBanner'
import ModuleSelect from './ModuleSelect'
import AdminSplitLayout from './AdminSplitLayout'
import AdminStatusCard from './AdminStatusCard'
import AdminModuleFilterSelect from './AdminModuleFilterSelect'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import ConfirmDialog from '../../components/ConfirmDialog'
import { ModuleIcon } from '../../lib/medicalIcons'
import { miniBtn, cancelBtnStyle, submitBtnStyle, inStyle as adminInStyle, fieldLabel, groupHeading, LIST_LIMIT } from './adminStyles'
import { EXAM_STAGES as STAGE_META } from '../../lib/examStages'
import { fetchModuleStages } from '../../lib/moduleStages'
import { useAdminMessage } from './useAdminMessage'
import { useAdminEntityCrud } from './useAdminEntityCrud'
import { EditIcon, PlusIcon, TrashIcon, ConstructionIcon, VideoIcon, AudioIcon, DocumentIcon } from '../../components/ui/tool-icons'
import type { AdminModule, AdminSubject, AdminLesson } from './adminTypes'

const EXAM_STAGES = STAGE_META.map(s => ({ value: s.value, label: s.title }))

interface FileRow {
  id: string
  name: string
  url: string
  type: string
  file_type: 'pdf' | 'video' | 'audio'
  module_id: string
  subject_id?: string | null
  lesson_id?: string | null
  exam_stage?: string | null
}

interface FilesTabProps {
  dark: boolean
  modules: AdminModule[]
  subjects: AdminSubject[]
  lessons: AdminLesson[]
}

export default function FilesTab({ dark, modules, subjects, lessons }: FilesTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const { message: msg, showMessage: showMsg } = useAdminMessage()

  const [files, setFiles] = useState<FileRow[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [filesError, setFilesError] = useState(false)
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [fileType, setFileType] = useState('sharah')
  const [fileFileType, setFileFileType] = useState('pdf')
  const [fileModuleId, setFileModuleId] = useState('')
  const [fileSubjectId, setFileSubjectId] = useState('')
  const [fileLessonId, setFileLessonId] = useState('')
  const [fileExamStage, setFileExamStage] = useState('')
  const [fileStageOptions, setFileStageOptions] = useState(EXAM_STAGES)
  const [moduleFilter, setModuleFilter] = useState('all')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => { fetchFiles() }, [])
  useEffect(() => {
    fetchModuleStages(fileModuleId).then(list => setFileStageOptions(list.map(s => ({ value: s.value, label: s.title }))))
  }, [fileModuleId])

  async function fetchFiles() {
    setFilesLoading(true)
    setFilesError(false)
    const { data, error } = await supabase.from('files').select('*').order('created_at', { ascending: false }).limit(LIST_LIMIT)
    if (data) setFiles(data as FileRow[])
    if (error) setFilesError(true)
    setFilesLoading(false)
  }

  function editFile(f: FileRow) {
    setEditingFileId(f.id)
    setFileName(f.name); setFileUrl(f.url); setFileType(f.type); setFileFileType(f.file_type)
    setFileModuleId(f.module_id); setFileSubjectId(f.subject_id || ''); setFileLessonId(f.lesson_id || '')
    setFileExamStage(f.exam_stage || '')
  }
  function resetFileForm() {
    setEditingFileId(null); setFileName(''); setFileUrl('')
    setFileSubjectId(''); setFileLessonId(''); setFileExamStage('')
  }

  const crud = useAdminEntityCrud({
    table: 'files', label: 'File', editingId: editingFileId,
    buildPayload: () => ({
      name: fileName, url: fileUrl, type: fileType,
      file_type: fileFileType, module_id: fileModuleId,
      subject_id: fileSubjectId || null,
      lesson_id: fileLessonId || null,
      exam_stage: fileExamStage || null
    }),
    resetForm: resetFileForm, refresh: fetchFiles, showMessage: showMsg
  })

  function saveFile() {
    if (!fileName || !fileUrl || !fileModuleId || crud.saving) return
    crud.save()
  }

  const filteredSubjects = (moduleId: string) => subjects.filter(s => s.module_id === moduleId)
  const filteredLessons = (subjectId: string) => lessons.filter(l => l.subject_id === subjectId)
  const visibleModules = moduleFilter === 'all' ? modules : modules.filter(m => m.id === moduleFilter)
  const FileTypeIcon = ({ t, color, size }: { t: string; color: string; size: number }) =>
    t === 'video' ? <VideoIcon color={color} size={size} /> : t === 'audio' ? <AudioIcon color={color} size={size} /> : <DocumentIcon color={color} size={size} />

  const form = (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
      <h3 style={{ color: pt.cobalt, marginBottom: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
        {editingFileId ? <><EditIcon color={pt.cobalt} size={16} /> Edit File / Recording</> : <><PlusIcon color={pt.cobalt} size={16} /> Add File / Recording</>}
      </h3>
      <input placeholder="File name" value={fileName} onChange={e => setFileName(e.target.value)} style={inStyle} />
      <input placeholder="URL (Drive / YouTube / SoundCloud)" value={fileUrl} onChange={e => setFileUrl(e.target.value)} style={inStyle} />

      <div className="admin-form-row-2">
        <div>
          <label style={fieldLabel(pt)}>Content Type</label>
          <select value={fileType} onChange={e => setFileType(e.target.value)} style={inStyle}>
            <option value="sharah">Explanation Files</option>
            <option value="questions">Question Files</option>
            <option value="lectures">Lecture Recordings</option>
            <option value="courses">Course Recordings</option>
          </select>
        </div>
        <div>
          <label style={fieldLabel(pt)}>File Type</label>
          <select value={fileFileType} onChange={e => setFileFileType(e.target.value)} style={inStyle}>
            <option value="pdf">PDF</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
        </div>
      </div>

      <label style={fieldLabel(pt)}>Module</label>
      <ModuleSelect modules={modules} value={fileModuleId} onChange={id => { setFileModuleId(id); setFileSubjectId(''); setFileLessonId('') }} dark={dark} />

      <label style={fieldLabel(pt)}>Subject (optional)</label>
      <select value={fileSubjectId} onChange={e => { setFileSubjectId(e.target.value); setFileLessonId('') }} style={inStyle} disabled={!fileModuleId}>
        <option value="">All Subjects</option>
        {filteredSubjects(fileModuleId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {fileSubjectId && filteredLessons(fileSubjectId).length > 0 && (
        <>
          <label style={fieldLabel(pt)}>Lesson (optional)</label>
          <select value={fileLessonId} onChange={e => setFileLessonId(e.target.value)} style={inStyle}>
            <option value="">No specific lesson</option>
            {filteredLessons(fileSubjectId).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </>
      )}

      <label style={fieldLabel(pt)}>Exam Stage (optional)</label>
      <select value={fileExamStage} onChange={e => setFileExamStage(e.target.value)} style={inStyle}>
        <option value="">No specific stage</option>
        {fileStageOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={saveFile} disabled={crud.saving} style={submitBtnStyle(pt, dark, crud.saving)}>
          {crud.saving ? 'Saving...' : editingFileId ? 'Save Changes' : 'Add File'}
        </button>
        {editingFileId && <button onClick={resetFileForm} disabled={crud.saving} style={cancelBtnStyle(pt, dark)}>Cancel</button>}
      </div>
    </LiquidGlassCard>
  )

  const list = (
    <div>
      {filesError && <ErrorBanner message="Couldn't load files — check your connection." />}
      <AdminModuleFilterSelect modules={modules} value={moduleFilter} onChange={setModuleFilter} totalCount={files.length} inStyle={inStyle} />

      {files.length === LIST_LIMIT && (
        <p style={{ color: pt.textMuted, fontSize: 11, marginBottom: 12 }}>Showing the most recent {LIST_LIMIT} — older files aren't listed here.</p>
      )}

      {filesLoading && <AdminStatusCard dark={dark} message="Loading..." />}

      {!filesLoading && files.length === 0 && (
        <AdminStatusCard dark={dark} message={<><ConstructionIcon color={pt.sub} size={14} /> No files yet — add one on the left</>} />
      )}

      {!filesLoading && visibleModules.map(mod => {
        const modFiles = files.filter(f => f.module_id === mod.id)
        if (modFiles.length === 0) return null
        return (
          <div key={mod.id} style={{ marginBottom: 20 }}>
            <h4 style={groupHeading(mod.color)}>
              <ModuleIcon value={mod.icon} size={18} color={mod.color} /> {mod.name}
              <span style={{ color: pt.textMuted, fontSize: 12, fontWeight: 400 }}>({modFiles.length})</span>
            </h4>
            <div className="admin-list-grid">
              {modFiles.map(f => (
                <LiquidGlassCard key={f.id} dark={dark} delay={0} style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileTypeIcon t={f.file_type} color={pt.text} size={14} />
                    <span style={{ color: pt.text, fontWeight: 600 }}>{f.name}</span>
                    <span style={{ color: pt.textMuted, fontSize: 12, marginLeft: 8 }}>· {f.type} · {f.file_type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => editFile(f)} aria-label={`Edit file: ${f.name}`} style={{ ...miniBtn(pt, pt.cobalt), display: 'inline-flex', alignItems: 'center' }}><EditIcon color={pt.cobalt} size={12} /></button>
                    <button onClick={() => setConfirmDeleteId(f.id)} aria-label={`Delete file: ${f.name}`} style={{ ...miniBtn(pt, pt.danger), display: 'inline-flex', alignItems: 'center' }}><TrashIcon color={pt.danger} size={12} /></button>
                  </div>
                </LiquidGlassCard>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div>
      <InlineMessage message={msg} />
      <AdminSplitLayout form={form} list={list} />
      <ConfirmDialog
        dark={dark}
        open={!!confirmDeleteId}
        title="Delete file?"
        message="This cannot be undone."
        confirmLabel="Delete"
        confirmColor={pt.danger}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => { const id = confirmDeleteId; setConfirmDeleteId(null); if (id) crud.remove(id) }}
      />
    </div>
  )
}
