import { useState } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import ModuleSelect from './ModuleSelect'
import AdminSplitLayout from './AdminSplitLayout'
import IconPicker from '../../components/admin/IconPicker'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import { ModuleIcon } from '../../lib/medicalIcons'
import { btnStyle, miniBtn, cancelBtnStyle, inStyle as adminInStyle, fieldLabel, groupHeading } from './adminStyles'
import { EditIcon, PlusIcon, TrashIcon, ConstructionIcon } from '../../components/ui/tool-icons'
import type { AdminModule, AdminSubject, AdminLesson } from './adminTypes'

interface LessonsTabProps {
  dark: boolean
  modules: AdminModule[]
  subjects: AdminSubject[]
  lessons: AdminLesson[]
  fetchLessons: () => void
  // AUDIT FIX (performance audit): see ModulesTab.tsx.
  refDataLoading: boolean
}

export default function LessonsTab({ dark, modules, subjects, lessons, fetchLessons, refDataLoading }: LessonsTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const [msg, setMsg] = useState('')
  function showMsg(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [lessonModuleId, setLessonModuleId] = useState('')
  const [lessonSubjectId, setLessonSubjectId] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonIcon, setLessonIcon] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  // AUDIT FIX (performance audit — double-submit risk): see
  // ModulesTab.tsx's saving state for the same reasoning.
  const [saving, setSaving] = useState(false)

  function editLesson(l: AdminLesson) {
    setEditingLessonId(l.id)
    setLessonModuleId(l.module_id); setLessonSubjectId(l.subject_id)
    setLessonTitle(l.title); setLessonIcon(l.icon || '')
  }
  function resetLessonForm() {
    setEditingLessonId(null); setLessonTitle(''); setLessonIcon('')
  }
  async function saveLesson() {
    if (!lessonTitle || !lessonSubjectId || !lessonModuleId || saving) return showMsg('❌ Pick a module, subject, and title first')
    const payload = { title: lessonTitle, subject_id: lessonSubjectId, module_id: lessonModuleId, icon: lessonIcon || null }
    setSaving(true)
    if (editingLessonId) {
      const { error } = await supabase.from('lessons').update(payload).eq('id', editingLessonId)
      setSaving(false)
      if (!error) { showMsg('✅ Lesson updated!'); resetLessonForm(); fetchLessons() }
      else showMsg('❌ ' + error.message)
    } else {
      const { error } = await supabase.from('lessons').insert([payload])
      setSaving(false)
      if (!error) { showMsg('✅ Lesson added!'); resetLessonForm(); fetchLessons() }
      else showMsg('❌ ' + error.message)
    }
  }
  async function deleteLesson(id: string) {
    if (!confirm('Delete this lesson? Questions tagged to it keep their module/subject tags but lose the lesson link. This cannot be undone.')) return
    if (editingLessonId === id) resetLessonForm()
    const { error } = await supabase.from('lessons').delete().eq('id', id)
    showMsg(error ? '❌ ' + error.message : '✅ Lesson deleted')
    fetchLessons()
  }

  const filteredSubjects = (moduleId: string) => subjects.filter(s => s.module_id === moduleId)
  const visibleModules = moduleFilter === 'all' ? modules : modules.filter(m => m.id === moduleFilter)

  const form = (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
      <h3 style={{ color: pt.cobalt, marginBottom: 8, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
        {editingLessonId ? <><EditIcon color={pt.cobalt} size={16} /> Edit Lesson</> : <><PlusIcon color={pt.cobalt} size={16} /> Add Lesson</>}
      </h3>
      <p style={{ color: pt.textMuted, fontSize: 13, marginBottom: 16 }}>
        A lesson lives under a subject and shows its own tagged question set (tag questions to a lesson from
        the Questions tab). Add a summary for it from the Summaries tab.
      </p>
      <label style={fieldLabel(pt)}>Module</label>
      <ModuleSelect modules={modules} value={lessonModuleId} onChange={id => { setLessonModuleId(id); setLessonSubjectId('') }} dark={dark} />
      {lessonModuleId && (
        <select value={lessonSubjectId} onChange={e => setLessonSubjectId(e.target.value)} style={inStyle}>
          <option value="">Select Subject</option>
          {filteredSubjects(lessonModuleId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      <input placeholder="Lesson title" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} style={inStyle} />
      <IconPicker value={lessonIcon} onChange={setLessonIcon} inStyle={inStyle} pt={pt} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={saveLesson} disabled={saving} style={{ ...btnStyle(pt, dark), flex: 1, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : editingLessonId ? 'Save Changes' : 'Add Lesson'}
        </button>
        {editingLessonId && <button onClick={resetLessonForm} disabled={saving} style={cancelBtnStyle(pt, dark)}>Cancel</button>}
      </div>
    </LiquidGlassCard>
  )

  const list = (
    <div>
      <div style={{ marginBottom: 16 }}>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} style={{ ...inStyle, width: 'auto', marginBottom: 0 }}>
          <option value="all">All modules ({lessons.length})</option>
          {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {refDataLoading && (
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: pt.sub }}>Loading...</p>
        </LiquidGlassCard>
      )}

      {!refDataLoading && lessons.length === 0 && (
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><ConstructionIcon color={pt.sub} size={14} /> No lessons yet — add one on the left</p>
        </LiquidGlassCard>
      )}

      {!refDataLoading && visibleModules.map(mod => {
        const modSubjects = filteredSubjects(mod.id)
        const modLessons = lessons.filter(l => l.module_id === mod.id)
        if (modLessons.length === 0) return null
        return (
          <div key={mod.id} style={{ marginBottom: 20 }}>
            <h4 style={groupHeading(mod.color)}>
              <ModuleIcon value={mod.icon} size={18} color={mod.color} /> {mod.name}
            </h4>
            {modSubjects.map(sub => {
              const subLessons = modLessons.filter(l => l.subject_id === sub.id)
              if (subLessons.length === 0) return null
              return (
                <div key={sub.id} style={{ marginBottom: 10 }}>
                  <div style={{ color: pt.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ModuleIcon value={sub.icon || '📖'} size={13} color={pt.textMuted} /> {sub.name}
                  </div>
                  <div className="admin-list-grid">
                    {subLessons.map(l => (
                      <LiquidGlassCard key={l.id} dark={dark} delay={0} style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <ModuleIcon value={l.icon || '📘'} size={18} color="#34d399" />
                          <span style={{ color: pt.text, fontWeight: 600 }}>{l.title}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => editLesson(l)} aria-label={`Edit lesson: ${l.title}`} style={{ ...miniBtn(pt, pt.cobalt), display: 'inline-flex', alignItems: 'center' }}><EditIcon color={pt.cobalt} size={12} /></button>
                          <button onClick={() => deleteLesson(l.id)} aria-label={`Delete lesson: ${l.title}`} style={{ ...miniBtn(pt, pt.danger), display: 'inline-flex', alignItems: 'center' }}><TrashIcon color={pt.danger} size={12} /></button>
                        </div>
                      </LiquidGlassCard>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )

  return (
    <div>
      <InlineMessage message={msg} />
      <AdminSplitLayout form={form} list={list} />
    </div>
  )
}
