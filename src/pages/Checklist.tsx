import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth, useModules } from '../contexts'
import { getPulseTheme, pulseFonts, ON_GRADIENT_TOP } from '../premiumTheme'
import { glassInput } from '../components/pulse/PulseUI'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../components/pulse/PulseBackground'
import BackButton from '../components/pulse/BackButton'
import PageIntro from '../components/pulse/PageIntro'
import ErrorBanner from '../components/ErrorBanner'
import TabRow from '../components/TabRow'
import NotifyPermissionButton from '../components/NotifyPermissionButton'
import { useToast } from '../components/ToastProvider'
import { ChecklistIcon, LightbulbIcon, CalendarDotIcon, WarningIcon, ClockIcon, CelebrationIcon, TrashIcon, BookIcon, CheckCircleIcon } from '../components/ui/tool-icons'
import type { ChecklistTask } from '../types/checklist'

const statNumStyle = { fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 30 }

const SECTION_GAP = 22
const TASK_GAP = 12

const CHECKLIST_KEY_PREFIX = 'checklist_'

function pruneOrphanedGuestChecklists(validModuleIds: Set<string>) {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(CHECKLIST_KEY_PREFIX)) continue
      const moduleId = key.slice(CHECKLIST_KEY_PREFIX.length)
      if (!validModuleIds.has(moduleId)) keysToRemove.push(key)
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch {
    // localStorage can throw in private-browsing/storage-full edge
    // cases — never let cleanup itself break the page.
  }
}

// ── Deadline helpers ────────────────────────────────────────────────
function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}
function dayDiff(deadline: string) {
  return Math.round((parseLocalDate(deadline).getTime() - startOfToday().getTime()) / (24 * 60 * 60 * 1000))
}
function isOverdue(deadline: string | null) {
  if (!deadline) return false
  return dayDiff(deadline) < 0
}
function isDueSoon(deadline: string | null) {
  if (!deadline) return false
  const diff = dayDiff(deadline)
  return diff >= 0 && diff <= 2
}

// Short, human-relative label instead of a raw ISO date — matches how
// every reference to-do app (Linear, ClickUp, Apple Reminders-style
// apps) labels deadlines: "Due today" / "Due tomorrow" / "2 days
// overdue" rather than a literal date, with a fallback to a short
// formatted date once something is far enough out that "in N days"
// stops being useful.
function formatDeadlineLabel(deadline: string) {
  const diff = dayDiff(deadline)
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  if (diff === -1) return '1 day overdue'
  if (diff < -1) return `${Math.abs(diff)} days overdue`
  if (diff > 1 && diff <= 6) return `Due in ${diff} days`
  const date = parseLocalDate(deadline)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return `Due ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' })}`
}

// Urgency tier used purely for sorting the active list — overdue
// first, then due-soon, then anything with a later deadline, then
// tasks with no deadline at all. This is the single biggest usability
// gap the layout had: tasks used to render in whatever order they
// were typed in, so a task due tomorrow could sit below five tasks
// due next month.
function urgencyRank(task: ChecklistTask) {
  if (!task.deadline) return 3
  if (isOverdue(task.deadline)) return 0
  if (isDueSoon(task.deadline)) return 1
  return 2
}

function sortByUrgency(tasks: ChecklistTask[]) {
  // Array.prototype.sort is stable, so tasks that tie on rank and
  // deadline keep their original (creation) order instead of jumping
  // around.
  return [...tasks].sort((a, b) => {
    const rankDiff = urgencyRank(a) - urgencyRank(b)
    if (rankDiff !== 0) return rankDiff
    if (a.deadline && b.deadline) return dayDiff(a.deadline) - dayDiff(b.deadline)
    return 0
  })
}

export default function Checklist({ dark }: { dark: boolean }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { modules, modulesLoaded, modulesError } = useModules()

  const showToast = useToast() as (message: string, type?: 'success' | 'error') => void

  const pt = getPulseTheme(dark)

  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [tasks, setTasks] = useState<ChecklistTask[]>([])
  const [newTask, setNewTask] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  // Completed tasks are tucked into a collapsed section by default —
  // they're still one tap away, but they no longer compete visually
  // with what's actually left to do. Same idea as the Completed
  // Modules disclosure on Home.
  const [showCompleted, setShowCompleted] = useState(false)

  const activeModulesList = (modules as any[]).filter(m => m.status === 'active')

  useEffect(() => {
    if (modulesLoaded && activeModulesList.length > 0 && !activeModule) {
      setActiveModule(activeModulesList[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesLoaded, modules])

  useEffect(() => {
    if (!modulesLoaded) return
    const validIds = new Set((modules as any[]).map(m => m.id))
    pruneOrphanedGuestChecklists(validIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesLoaded])

  useEffect(() => { if (activeModule) fetchTasks() }, [activeModule, user])
  useEffect(() => { setShowCompleted(false) }, [activeModule])

  const notifiedSignedInRef = useRef(false)
  useEffect(() => {
    if (user && !notifiedSignedInRef.current) {
      notifiedSignedInRef.current = true
      showToast('✅ Signed in — checklist synced to your account')
    }
  }, [user, showToast])

  async function fetchTasks() {
    if (user) {
      const { data } = await supabase.from('user_checklist')
        .select('*').eq('user_id', user.id).eq('module_id', activeModule).order('created_at')
      if (data) setTasks(data as ChecklistTask[])
    } else {
      const saved = JSON.parse(localStorage.getItem(`checklist_${activeModule}`) || '[]')
      setTasks(saved)
    }
  }

  async function addTask() {
    if (!newTask.trim()) return
    if (user) {
      const { data } = await supabase.from('user_checklist').insert([{
        user_id: user.id, module_id: activeModule,
        text: newTask.trim(), done: false,
        deadline: newDeadline || null
      }]).select().single()
      if (data) setTasks(prev => [...prev, data as ChecklistTask])
    } else {
      const task: ChecklistTask = {
        id: crypto.randomUUID(), text: newTask.trim(), done: false,
        module_id: activeModule as string, deadline: newDeadline || null
      }
      const updated = [...tasks, task]
      setTasks(updated)
      localStorage.setItem(`checklist_${activeModule}`, JSON.stringify(updated))
    }
    setNewTask('')
    setNewDeadline('')
    showToast('✅ Task added')
  }

  async function toggleTask(task: ChecklistTask) {
    if (user) {
      await supabase.from('user_checklist').update({ done: !task.done }).eq('id', task.id)
    }
    const updated = tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t)
    setTasks(updated)
    if (!user) localStorage.setItem(`checklist_${activeModule}`, JSON.stringify(updated))
  }

  async function deleteTask(task: ChecklistTask) {
    if (user) await supabase.from('user_checklist').delete().eq('id', task.id)
    const updated = tasks.filter(t => t.id !== task.id)
    setTasks(updated)
    if (!user) localStorage.setItem(`checklist_${activeModule}`, JSON.stringify(updated))
  }

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    if (tasks.length === 0) return
    const todayStr = new Date().toDateString()
    if (localStorage.getItem('znu_checklist_last_notify') === todayStr) return

    const urgent = tasks.filter(t => !t.done && (isOverdue(t.deadline) || isDueSoon(t.deadline)))
    if (urgent.length > 0) {
      new Notification('ZNU Future Doctors', {
        body: `You have ${urgent.length} checklist item(s) due soon or overdue.`
      })
      localStorage.setItem('znu_checklist_last_notify', todayStr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks])

  // Active tasks sorted by urgency (overdue → due soon → later →
  // no deadline); completed tasks pulled into their own list so the
  // main view only ever shows what's actually left to do.
  const activeTasks = useMemo(() => sortByUrgency(tasks.filter(t => !t.done)), [tasks])
  const completedTasks = useMemo(() => tasks.filter(t => t.done), [tasks])

  const doneTasks = completedTasks.length
  const totalTasks = tasks.length
  const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const inStyle = { ...glassInput(pt, dark), padding: '13px 20px', marginBottom: 0 }

  function renderTaskRow(task: ChecklistTask, delay: number) {
    const overdue = isOverdue(task.deadline) && !task.done
    const dueSoon = isDueSoon(task.deadline) && !task.done && !overdue
    const dotColor = task.done ? pt.cobalt : overdue ? pt.danger : dueSoon ? pt.amber : pt.faint

    return (
      <LiquidGlassCard key={task.id} dark={dark} delay={delay} style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            role="checkbox" aria-checked={task.done} aria-label={task.text} tabIndex={0}
            onClick={() => toggleTask(task)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTask(task) } }}
            style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: task.done ? `${pt.cobalt}22` : 'transparent',
              border: `1px solid ${task.done ? pt.cobaltBorder : pt.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: pt.cobalt, fontWeight: 900, fontSize: 13
            }}
          >{task.done && '✓'}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              color: task.done ? pt.sub : overdue ? pt.danger : pt.text,
              textDecoration: task.done ? 'line-through' : 'none',
              fontSize: 14, fontWeight: 600, wordBreak: 'break-word'
            }}>{task.text}</div>
            {task.deadline && (
              <div style={{
                fontSize: 11, marginTop: 2,
                color: overdue ? pt.danger : dueSoon ? pt.amber : pt.faint,
                fontWeight: overdue || dueSoon ? 700 : 500,
                display: 'flex', alignItems: 'center', gap: 5
              }}>
                {overdue
                  ? <WarningIcon color={pt.danger} size={12} />
                  : dueSoon
                    ? <ClockIcon color={pt.amber} size={12} />
                    : <CalendarDotIcon color={pt.faint} size={12} />}
                {formatDeadlineLabel(task.deadline)}
              </div>
            )}
          </div>

          <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />

          {/* Bigger tap target than the icon itself (44px, the usual
              minimum comfortable touch size) so this doesn't sit so
              close to the checkbox that a slightly-off tap deletes a
              task instead of completing it. */}
          <button
            onClick={() => deleteTask(task)}
            aria-label={`Delete task: ${task.text}`}
            style={{
              background: 'transparent', border: 'none',
              cursor: 'pointer', flexShrink: 0,
              width: 40, height: 40, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          ><TrashIcon color={pt.danger} size={15} /></button>
        </div>
      </LiquidGlassCard>
    )
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div className="pulse-wide checklist-page" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body, maxWidth: 900, margin: '0 auto' }}>
        <style>{`
          /* Add-task row: input + button share a row on wider screens,
             stack cleanly on narrow ones instead of squeezing. */
          .checklist-add-row { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
          .checklist-add-row input { flex: 1 1 180px; min-width: 0; }
          .checklist-add-btn { flex: 0 0 auto; }
          @media (max-width: 420px) {
            .checklist-add-row { flex-direction: column; }
            .checklist-add-btn { width: 100%; }
          }
          .checklist-deadline-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
          .checklist-deadline-row input[type="date"] { flex: 1 1 160px; min-width: 0; }
        `}</style>

        <div style={{ marginBottom: 8 }}>
          <BackButton dark={dark} fallback="/" />
        </div>

        {modulesError && <ErrorBanner />}

        <PageIntro dark={dark} emoji={<ChecklistIcon color={ON_GRADIENT_TOP.primary} size={40} />} title="Checklist" subtitle="Track what's left before exam day" />

        <div style={{ marginBottom: SECTION_GAP }}>
          <NotifyPermissionButton dark={dark} label="Enable deadline reminders" />
        </div>

        {!user && (
          <div style={{ marginBottom: SECTION_GAP }}>
            <LiquidGlassCard dark={dark} delay={0} style={{ padding: '12px 18px', textAlign: 'center' }}>
              <span style={{ color: pt.cobalt, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <LightbulbIcon color={pt.cobalt} size={14} /> <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/auth')}>Sign in</span> to save your checklist across devices
              </span>
            </LiquidGlassCard>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: SECTION_GAP }}>
          <TabRow
            items={activeModulesList.map((m: any) => ({
              value: m.id, label: m.name, icon: m.icon, color: m.color, completed: m.status === 'completed'
            }))}
            active={activeModule}
            onSelect={setActiveModule}
            dark={dark}
            style={{
              justifyContent: 'center',
              flexWrap: 'wrap',
              overflowX: 'visible',
              marginBottom: 0,
              rowGap: 10,
            }}
          />
        </div>

        {totalTasks > 0 && (
          <div style={{ marginBottom: SECTION_GAP }}>
            <LiquidGlassCard dark={dark} delay={80} style={{ padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <span style={{ color: pt.text, fontWeight: 700, fontSize: 14 }}>Overall Progress</span>
                <span style={{ ...statNumStyle, fontSize: 20, color: pt.amber }}>{doneTasks}/{totalTasks}</span>
              </div>
              <div style={{
                background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                borderRadius: 20, height: 7, overflow: 'hidden',
                boxShadow: dark ? 'inset 0 1px 2px rgba(0,0,0,0.4)' : 'inset 0 1px 2px rgba(0,0,0,0.08)'
              }}>
                <div style={{
                  height: '100%', borderRadius: 20,
                  background: percent === 100 ? `linear-gradient(90deg, ${pt.cobalt}, ${pt.indigo})` : `linear-gradient(90deg, ${pt.amber}, ${pt.terracotta})`,
                  width: `${percent}%`, transition: 'width 0.5s ease'
                }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: 12, color: percent === 100 ? pt.cobalt : pt.amber, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {percent}% {percent === 100 ? (<><CelebrationIcon color={pt.cobalt} size={14} /> Ready for exam!</>) : 'completed'}
              </div>
            </LiquidGlassCard>
          </div>
        )}

        <div style={{ marginBottom: SECTION_GAP }}>
          <LiquidGlassCard dark={dark} delay={140} style={{ padding: '18px 20px' }}>
            <div className="checklist-add-row">
              <input
                placeholder="Add a topic to study..."
                value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                style={inStyle} />
              {/* AUDIT FIX (per user request): this used to be
                  glassPrimaryBtn's cobalt→indigo gradient, which reads
                  as purple. Replaced with a flat, solid cobalt fill —
                  no gradient at all — so the primary action on this
                  page is a plain, unambiguous color instead of a
                  blended one. */}
              <button
                onClick={addTask}
                className="checklist-add-btn"
                style={{
                  background: pt.cobalt, color: '#fff', border: 'none',
                  borderRadius: 999, padding: '0 22px', minHeight: 46,
                  cursor: 'pointer', fontWeight: 700, fontSize: 14,
                  fontFamily: pulseFonts.body
                }}
              >
                + Add
              </button>
            </div>
            <div className="checklist-deadline-row">
              <span style={{ color: pt.faint, fontSize: 12, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <CalendarDotIcon color={pt.faint} size={13} /> Deadline (optional):
              </span>
              <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} style={{ ...inStyle }} />
            </div>
          </LiquidGlassCard>
        </div>

        {!modulesLoaded && <p style={{ color: ON_GRADIENT_TOP.secondary, textAlign: 'center' }}>Loading...</p>}

        {modulesLoaded && totalTasks === 0 && (
          <LiquidGlassCard dark={dark} delay={200} style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              No tasks yet — add topics you need to study! <BookIcon color={pt.sub} size={15} />
            </p>
          </LiquidGlassCard>
        )}

        {/* Active tasks — sorted overdue-first so the thing that
            actually needs attention today is always at the top,
            regardless of when it was added. */}
        {activeTasks.map((task, i) => (
          <div key={task.id} style={{ marginBottom: i === activeTasks.length - 1 ? 0 : TASK_GAP }}>
            {renderTaskRow(task, 240 + i * 90)}
          </div>
        ))}

        {/* All done, nothing left active — a quiet confirmation
            instead of just an empty gap where the task list used to
            be. */}
        {modulesLoaded && totalTasks > 0 && activeTasks.length === 0 && (
          <LiquidGlassCard dark={dark} delay={200} style={{ padding: 32, textAlign: 'center', marginBottom: TASK_GAP }}>
            <p style={{ color: pt.cobalt, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CelebrationIcon color={pt.cobalt} size={16} /> Everything's checked off!
            </p>
          </LiquidGlassCard>
        )}

        {/* Completed — tucked behind a simple toggle so finished
            topics don't compete for attention with what's still left,
            but stay one tap away (and are never deleted just for
            being done). */}
        {completedTasks.length > 0 && (
          <div style={{ marginTop: activeTasks.length > 0 ? SECTION_GAP : 0 }}>
            <button
              onClick={() => setShowCompleted(o => !o)}
              aria-expanded={showCompleted}
              style={{
                width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '10px 4px', marginBottom: showCompleted ? 10 : 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                color: pt.textMuted, fontSize: 13, fontWeight: 700, fontFamily: pulseFonts.body
              }}
            >
              <CheckCircleIcon color={pt.textMuted} size={14} />
              Completed ({completedTasks.length})
              <span style={{
                display: 'inline-flex', transform: showCompleted ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease'
              }}>
                <ChevronDown size={14} color={pt.textMuted} />
              </span>
            </button>

            {showCompleted && completedTasks.map((task, i) => (
              <div key={task.id} style={{ marginBottom: i === completedTasks.length - 1 ? 0 : TASK_GAP, opacity: 0.75 }}>
                {renderTaskRow(task, 0)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
