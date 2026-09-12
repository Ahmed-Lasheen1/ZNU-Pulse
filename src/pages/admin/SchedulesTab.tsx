import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import ModuleSelect from './ModuleSelect'
import AdminSplitLayout from './AdminSplitLayout'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import { ModuleIcon } from '../../lib/medicalIcons'
import { btnStyle, miniBtn, cancelBtnStyle, inStyle as adminInStyle, fieldLabel, groupHeading, LIST_LIMIT } from './adminStyles'
import { useAdminMessage } from './useAdminMessage'
import { EditIcon, PlusIcon, TrashIcon, ConstructionIcon, CalendarDotIcon } from '../../components/ui/tool-icons'
import { ExamIcon } from '../../lib/medicalIcons'
import type { AdminModule } from './adminTypes'

interface ScheduleRow {
  id: string
  title: string
  url: string
  type: 'study' | 'exam'
  module_id: string
  // A schedule item can carry more than one exam date (e.g. a full
  // staged exam schedule), stored as an array rather than a single date.
  dates?: string[] | null
}

interface SchedulesTabProps {
  dark: boolean
  modules: AdminModule[]
}

export default function SchedulesTab({ dark, modules }: SchedulesTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const { message: msg, showMessage: showMsg } = useAdminMessage()

  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(true)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [schTitle, setSchTitle] = useState('')
  const [schUrl, setSchUrl] = useState('')
  const [schType, setSchType] = useState<'study' | 'exam'>('study')
  const [schModuleId, setSchModuleId] = useState('')
  // Always at least one date input row, even when empty.
  const [schDates, setSchDates] = useState<string[]>([''])
  const [moduleFilter, setModuleFilter] = useState('all')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSchedules() }, [])

  async function fetchSchedules() {
    setSchedulesLoading(true)
    const { data } = await supabase.from('schedules').select('*').order('created_at', { ascending: false }).limit(LIST_LIMIT)
    if (data) setSchedules(data as ScheduleRow[])
    setSchedulesLoading(false)
  }

  function editSchedule(s: ScheduleRow) {
    setEditingScheduleId(s.id)
    setSchTitle(s.title); setSchUrl(s.url); setSchType(s.type); setSchModuleId(s.module_id)
    setSchDates(s.dates && s.dates.length > 0 ? s.dates : [''])
  }
  function resetScheduleForm() {
    setEditingScheduleId(null); setSchTitle(''); setSchUrl(''); setSchDates([''])
  }

  function updateDateAt(index: number, value: string) {
    setSchDates(prev => prev.map((d, i) => i === index ? value : d))
  }
  function addDateRow() {
    setSchDates(prev => [...prev, ''])
  }
  function removeDateRow(index: number) {
    setSchDates(prev => (prev.length === 1 ? [''] : prev.filter((_, i) => i !== index)))
  }

  async function saveSchedule() {
    if (!schTitle || !schUrl || !schModuleId || saving) return
    const cleanedDates = schDates.map(d => d.trim()).filter(Boolean)
    const payload = {
      title: schTitle, url: schUrl, type: schType, module_id: schModuleId,
      dates: schType === 'exam' && cleanedDates.length > 0 ? cleanedDates : null
    }
    setSaving(true)
    if (editingScheduleId) {
      const { error } = await supabase.from('schedules').update(payload).eq('id', editingScheduleId)
      setSaving(false)
      if (!error) { showMsg('✅ Schedule updated!'); resetScheduleForm(); fetchSchedules() }
      else showMsg('❌ ' + error.message)
    } else {
      const { error } = await supabase.from('schedules').insert([payload])
      setSaving(false)
      if (!error) { showMsg('✅ Schedule added!'); resetScheduleForm(); fetchSchedules() }
      else showMsg('❌ ' + error.message)
    }
  }
  async function deleteSchedule(id: string) {
    if (!confirm('Delete this schedule? This cannot be undone.')) return
    if (editingScheduleId === id) resetScheduleForm()
    const { error } = await supabase.from('schedules').delete().eq('id', id)
    showMsg(error ? '❌ ' + error.message : '✅ Schedule deleted')
    fetchSchedules()
  }

  const visibleModules = moduleFilter === 'all' ? modules : modules.filter(m => m.id === moduleFilter)

  const form = (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
      <h3 style={{ color: pt.cobalt, marginBottom: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
        {editingScheduleId ? <><EditIcon color={pt.cobalt} size={16} /> Edit Schedule</> : <><PlusIcon color={pt.cobalt} size={16} /> Add Schedule</>}
      </h3>
      <input placeholder="Title (e.g. Week 1)" value={schTitle} onChange={e => setSchTitle(e.target.value)} style={inStyle} />
      <input placeholder="Image URL (Google Drive)" value={schUrl} onChange={e => setSchUrl(e.target.value)} style={inStyle} />
      <label style={fieldLabel(pt)}>Type</label>
      <select value={schType} onChange={e => setSchType(e.target.value as 'study' | 'exam')} style={inStyle}>
        <option value="study">Study Schedule</option>
        <option value="exam">Exam Schedule</option>
      </select>
      {schType === 'exam' && (
        <>
          <label style={fieldLabel(pt)}>Exam Date(s) (for reminder notifications)</label>
          {schDates.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="date"
                value={d}
                onChange={e => updateDateAt(i, e.target.value)}
                style={{ ...inStyle, marginBottom: 0, flex: 1 }}
              />
              <button
                onClick={() => removeDateRow(i)}
                aria-label="Remove this date"
                style={{ ...miniBtn(pt, pt.danger), display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              ><TrashIcon color={pt.danger} size={12} /></button>
            </div>
          ))}
          <button onClick={addDateRow} style={{
            background: 'transparent', border: `1px dashed ${pt.border}`, borderRadius: 10,
            padding: '8px', width: '100%', cursor: 'pointer', color: pt.sub,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700, marginBottom: 12,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5
          }}><PlusIcon color={pt.sub} size={11} /> Add Another Exam Date</button>
        </>
      )}
      <label style={fieldLabel(pt)}>Module</label>
      <ModuleSelect modules={modules} value={schModuleId} onChange={setSchModuleId} dark={dark} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={saveSchedule} disabled={saving} style={{ ...btnStyle(pt, dark), flex: 1, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : editingScheduleId ? 'Save Changes' : 'Add Schedule'}
        </button>
        {editingScheduleId && <button onClick={resetScheduleForm} disabled={saving} style={cancelBtnStyle(pt, dark)}>Cancel</button>}
      </div>
    </LiquidGlassCard>
  )

  const list = (
    <div>
      <div style={{ marginBottom: 16 }}>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} style={{ ...inStyle, width: 'auto', marginBottom: 0 }}>
          <option value="all">All modules ({schedules.length})</option>
          {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {schedulesLoading && (
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: pt.sub }}>Loading...</p>
        </LiquidGlassCard>
      )}

      {!schedulesLoading && schedules.length === 0 && (
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><ConstructionIcon color={pt.sub} size={14} /> No schedules yet — add one on the left</p>
        </LiquidGlassCard>
      )}

      {!schedulesLoading && visibleModules.map(mod => {
        const modSchedules = schedules.filter(s => s.module_id === mod.id)
        if (modSchedules.length === 0) return null
        return (
          <div key={mod.id} style={{ marginBottom: 20 }}>
            <h4 style={groupHeading(mod.color)}>
              <ModuleIcon value={mod.icon} size={18} color={mod.color} /> {mod.name}
              <span style={{ color: pt.textMuted, fontSize: 12, fontWeight: 400 }}>({modSchedules.length})</span>
            </h4>
            <div className="admin-list-grid">
              {modSchedules.map(s => (
                <LiquidGlassCard key={s.id} dark={dark} delay={0} style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {s.type === 'exam' ? <ExamIcon color={pt.text} size={14} /> : <CalendarDotIcon color={pt.text} size={14} />}
                    <span style={{ color: pt.text, fontWeight: 600 }}>{s.title}</span>
                    <span style={{ color: pt.textMuted, fontSize: 12, marginLeft: 4 }}>
                      · {s.type}{s.dates && s.dates.length > 0 ? ` · ${s.dates.slice().sort().join(', ')}` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => editSchedule(s)} aria-label={`Edit schedule: ${s.title}`} style={{ ...miniBtn(pt, pt.cobalt), display: 'inline-flex', alignItems: 'center' }}><EditIcon color={pt.cobalt} size={12} /></button>
                    <button onClick={() => deleteSchedule(s.id)} aria-label={`Delete schedule: ${s.title}`} style={{ ...miniBtn(pt, pt.danger), display: 'inline-flex', alignItems: 'center' }}><TrashIcon color={pt.danger} size={12} /></button>
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
    </div>
  )
}
