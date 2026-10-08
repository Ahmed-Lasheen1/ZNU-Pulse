import { useState } from 'react'
import { getPulseTheme } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import AdminSplitLayout from './AdminSplitLayout'
import AdminFormCard from './AdminFormCard'
import AdminRow from './AdminRow'
import AdminGroupedList from './AdminGroupedList'
import AdminDeleteDialog from './AdminDeleteDialog'
import { inStyle as adminInStyle, fieldLabel } from './adminStyles'
import { useAdminMessage } from './useAdminMessage'
import { useAdminEntityCrud } from './useAdminEntityCrud'
import { useConfirmDelete } from './useConfirmDelete'
import { useAdminList } from './useAdminList'
import { useStageOptions } from './useStageOptions'
import { PICK_MODULE_MESSAGE, REQUIRED_FIELDS_MESSAGE } from './useAdminContext'
import { ConstructionIcon, LinkIcon, UploadIcon } from '../../components/ui/tool-icons'
import { publishSummary, MAX_UPLOAD_BYTES } from '../../lib/publishSummary'
import type { AdminModule, AdminSubject, AdminContext } from './adminTypes'

interface SummaryRow {
  id: string
  title: string
  url: string
  module_id: string
  subject_id?: string | null
  lesson_id?: string | null
  exam_stage?: string | null
}

interface SummariesTabProps {
  dark: boolean
  modules: AdminModule[]
  subjects: AdminSubject[]
  context: AdminContext
}

type PublishMode = 'link' | 'upload'

const PUBLISH_MODES = [
  { id: 'link', label: 'Paste a Link', Icon: LinkIcon },
  { id: 'upload', label: 'Upload HTML', Icon: UploadIcon },
] as const

export default function SummariesTab({ dark, modules, subjects, context }: SummariesTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const { message, showMessage } = useAdminMessage(4000)
  const stageOptions = useStageOptions(context.moduleId)
  const { rows: summaries, loading, error, refresh } = useAdminList<SummaryRow>({ table: 'summaries', moduleId: context.moduleId })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [examStage, setExamStage] = useState('')
  const [publishMode, setPublishMode] = useState<PublishMode>('link')
  const [htmlFile, setHtmlFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [fileInputKey, setFileInputKey] = useState(0)
  const [publishing, setPublishing] = useState(false)

  function editSummary(summary: SummaryRow) {
    setEditingId(summary.id)
    setPublishMode('link')
    setTitle(summary.title)
    setUrl(summary.url)
    setExamStage(summary.exam_stage || '')
    context.setContext({ moduleId: summary.module_id, subjectId: summary.subject_id || '', lessonId: summary.lesson_id || '' })
  }

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setUrl('')
    setExamStage('')
    setHtmlFile(null)
    setImageFiles([])
    setFileInputKey(k => k + 1)
  }

  const crud = useAdminEntityCrud({
    table: 'summaries',
    label: 'Summary',
    editingId,
    buildPayload: () => ({
      title,
      url,
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

  function saveSummary() {
    if (crud.saving) return
    if (!context.moduleId) return showMessage(PICK_MODULE_MESSAGE)
    if (!title || !url) return showMessage(REQUIRED_FIELDS_MESSAGE)
    crud.save()
  }

  async function publishFromFile() {
    if (publishing) return
    if (!context.moduleId) return showMessage(PICK_MODULE_MESSAGE)
    if (!title || !htmlFile) return showMessage('❌ A title and an HTML file are required')
    setPublishing(true)
    try {
      const result = await publishSummary({
        title,
        htmlFile,
        imageFiles,
        moduleId: context.moduleId,
        moduleName: modules.find(m => m.id === context.moduleId)?.name || context.moduleId,
        subjectId: context.subjectId || null,
        subjectName: subjects.find(s => s.id === context.subjectId)?.name || null,
        lessonId: context.lessonId || null,
        examStage: examStage || null,
      })
      showMessage('✅ Summary published! URL: ' + result.url)
      resetForm()
      refresh()
    } catch (e: any) {
      showMessage('❌ ' + (e?.message || 'Could not publish summary'))
    } finally {
      setPublishing(false)
    }
  }

  const isLink = !!editingId || publishMode === 'link'
  const totalUploadBytes = (htmlFile?.size || 0) + imageFiles.reduce((sum, f) => sum + f.size, 0)
  const overSizeLimit = totalUploadBytes > MAX_UPLOAD_BYTES

  const form = (
    <AdminFormCard
      dark={dark}
      noun="Summary"
      editing={!!editingId}
      addLabel={isLink ? 'Add Summary' : 'Publish Summary'}
      saving={crud.saving || publishing}
      savingLabel={publishing ? 'Publishing...' : 'Saving...'}
      disabled={!isLink && overSizeLimit}
      onSave={isLink ? saveSummary : publishFromFile}
      onCancel={editingId ? resetForm : undefined}
    >
      {!editingId && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {PUBLISH_MODES.map(mode => {
            const active = publishMode === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => setPublishMode(mode.id)}
                style={{
                  flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${active ? pt.cobalt : pt.border}`,
                  background: active ? `${pt.cobalt}18` : 'transparent',
                  color: active ? pt.cobalt : pt.sub, fontWeight: 700, fontSize: 12,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                <mode.Icon color={active ? pt.cobalt : pt.sub} size={13} /> {mode.label}
              </button>
            )
          })}
        </div>
      )}

      <input placeholder="Title (e.g. End Module Exam)" value={title} onChange={e => setTitle(e.target.value)} style={inStyle} />

      {isLink ? (
        <input placeholder="Summary URL" value={url} onChange={e => setUrl(e.target.value)} style={inStyle} />
      ) : (
        <>
          <label style={fieldLabel(pt)}>HTML File</label>
          <input
            key={`html-${fileInputKey}`}
            type="file"
            accept=".html,.htm"
            onChange={e => setHtmlFile(e.target.files?.[0] || null)}
            style={{ ...inStyle, padding: '10px 12px' }}
          />
          <label style={fieldLabel(pt)}>Images (optional — referenced by the HTML with relative paths)</label>
          <input
            key={`images-${fileInputKey}`}
            type="file"
            accept="image/*"
            multiple
            onChange={e => setImageFiles(Array.from(e.target.files || []))}
            style={{ ...inStyle, padding: '10px 12px' }}
          />
          {(htmlFile || imageFiles.length > 0) && (
            <div style={{ color: overSizeLimit ? pt.danger : pt.textMuted, fontSize: 11, marginBottom: 12 }}>
              {imageFiles.length} image{imageFiles.length === 1 ? '' : 's'} · Total: {(totalUploadBytes / (1024 * 1024)).toFixed(1)} MB
              {overSizeLimit ? ' — too large to publish; compress images and keep the total under ~3 MB' : ''}
            </div>
          )}
        </>
      )}

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
      items={summaries}
      moduleOf={s => s.module_id}
      loading={loading}
      error={error}
      noun="summaries"
      emptyMessage={<><ConstructionIcon color={pt.sub} size={14} /> No summaries yet — add one on the left</>}
      renderItem={s => (
        <AdminRow
          key={s.id}
          dark={dark}
          noun="summary"
          label={s.title}
          active={editingId === s.id}
          onEdit={() => editSummary(s)}
          onDelete={() => del.requestDelete(s.id)}
        >
          <span style={{ color: pt.text, fontWeight: 600 }}>{s.title}</span>
        </AdminRow>
      )}
    />
  )

  return (
    <div>
      <InlineMessage message={message} />
      <AdminSplitLayout form={form} list={list} />
      <AdminDeleteDialog dark={dark} noun="summary" del={del} />
    </div>
  )
}
