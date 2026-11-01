import { useState } from 'react'
import { getPulseTheme } from '@/shared/theme/premiumTheme'
import InlineMessage from '@/shared/ui/feedback/InlineMessage'
import AdminSplitLayout from '@/features/admin/common/AdminSplitLayout'
import AdminFormCard from '@/features/admin/common/AdminFormCard'
import AdminRow from '@/features/admin/common/AdminRow'
import AdminGroupedList from '@/features/admin/common/AdminGroupedList'
import AdminDeleteDialog from '@/features/admin/common/AdminDeleteDialog'
import { inStyle as adminInStyle, fieldLabel } from '@/features/admin/common/adminStyles'
import { useAdminMessage } from '@/features/admin/common/useAdminMessage'
import { useAdminEntityCrud } from '@/features/admin/common/useAdminEntityCrud'
import { useConfirmDelete } from '@/features/admin/common/useConfirmDelete'
import { useAdminList } from '@/features/admin/common/useAdminList'
import { useStageOptions } from '@/features/admin/common/useStageOptions'
import { PICK_MODULE_MESSAGE, REQUIRED_FIELDS_MESSAGE } from '@/features/admin/common/useAdminContext'
import { ConstructionIcon } from '@/shared/icons/tool-icons'
import { FileTypeIcon } from '@/shared/icons/FileTypeIcon'
import type { AdminModule, AdminContext } from '@/features/admin/common/adminTypes'

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
  context: AdminContext
}

export default function FilesTab({ dark, modules, context }: FilesTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const { message, showMessage } = useAdminMessage()
  const stageOptions = useStageOptions(context.moduleId)
  const { rows: files, loading, error, refresh } = useAdminList<FileRow>({ table: 'files', moduleId: context.moduleId })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState('sharah')
  const [fileType, setFileType] = useState<FileRow['file_type']>('pdf')
  const [examStage, setExamStage] = useState('')

  function editFile(file: FileRow) {
    setEditingId(file.id)
    setName(file.name)
    setUrl(file.url)
    setType(file.type)
    setFileType(file.file_type)
    setExamStage(file.exam_stage || '')
    context.setContext({ moduleId: file.module_id, subjectId: file.subject_id || '', lessonId: file.lesson_id || '' })
  }

  function resetForm() {
    setEditingId(null)
    setName('')
    setUrl('')
    setExamStage('')
  }

  const crud = useAdminEntityCrud({
    table: 'files',
    label: 'File',
    editingId,
    buildPayload: () => ({
      name,
      url,
      type,
      file_type: fileType,
      module_id: context.moduleId,
      subject_id: context.subjectId || null,
      lesson_id: context.lessonId || null,
      exam_stage: examStage || null,
    }),
    resetForm,
    refresh,
    showMessage,
  })
  const del = useConfirmDelete(crud.remove)

  function saveFile() {
    if (crud.saving) return
    if (!context.moduleId) return showMessage(PICK_MODULE_MESSAGE)
    if (!name || !url) return showMessage(REQUIRED_FIELDS_MESSAGE)
    crud.save()
  }

  const form = (
    <AdminFormCard
      dark={dark}
      noun="File / Recording"
      editing={!!editingId}
      addLabel="Add File"
      saving={crud.saving}
      onSave={saveFile}
      onCancel={editingId ? resetForm : undefined}
    >
      <input placeholder="File name" value={name} onChange={e => setName(e.target.value)} style={inStyle} />
      <input placeholder="URL (Drive / YouTube / SoundCloud)" value={url} onChange={e => setUrl(e.target.value)} style={inStyle} />

      <div className="admin-form-row-2">
        <div>
          <label style={fieldLabel(pt)}>Content Type</label>
          <select value={type} onChange={e => setType(e.target.value)} style={inStyle}>
            <option value="sharah">Explanation Files</option>
            <option value="questions">Question Files</option>
            <option value="lectures">Lecture Recordings</option>
            <option value="courses">Course Recordings</option>
          </select>
        </div>
        <div>
          <label style={fieldLabel(pt)}>File Type</label>
          <select value={fileType} onChange={e => setFileType(e.target.value as FileRow['file_type'])} style={inStyle}>
            <option value="pdf">PDF</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
        </div>
      </div>

      <label style={fieldLabel(pt)}>Exam Stage (optional)</label>
      <select value={examStage} onChange={e => setExamStage(e.target.value)} style={inStyle}>
        <option value="">No specific stage</option>
        {stageOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </AdminFormCard>
  )

  const list = (
    <AdminGroupedList
      dark={dark}
      modules={modules}
      items={files}
      moduleOf={f => f.module_id}
      loading={loading}
      error={error}
      noun="files"
      emptyMessage={<><ConstructionIcon color={pt.sub} size={14} /> No files yet — add one on the left</>}
      renderItem={f => (
        <AdminRow
          key={f.id}
          dark={dark}
          noun="file"
          label={f.name}
          active={editingId === f.id}
          onEdit={() => editFile(f)}
          onDelete={() => del.requestDelete(f.id)}
        >
          <FileTypeIcon type={f.file_type} color={pt.text} />
          <span style={{ color: pt.text, fontWeight: 600 }}>{f.name}</span>
          <span style={{ color: pt.textMuted, fontSize: 12 }}>· {f.type} · {f.file_type}</span>
        </AdminRow>
      )}
    />
  )

  return (
    <div>
      <InlineMessage message={message} />
      <AdminSplitLayout form={form} list={list} />
      <AdminDeleteDialog dark={dark} noun="file" del={del} />
    </div>
  )
}
