// src/pages/Checklist.tsx
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { supabase } from '@/core/supabase'
import { useAuth, useModules } from '@/core/contexts'
import { getPulseTheme, pulseFonts, ON_GRADIENT_TOP } from '@/shared/theme/premiumTheme'
import { glassInput } from '@/shared/ui/glass/PulseUI'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import PageShell from '@/shared/ui/layout/PageShell'
import PageIntro from '@/shared/ui/layout/PageIntro'
import { ChecklistSkeleton } from '@/shared/ui/feedback/Skeletons'
import OfflineNote from '@/shared/ui/feedback/OfflineNote'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import TabRow from '@/shared/ui/controls/TabRow'
import { NotifyPermissionButton } from '@/features/notifications'
import { useToast } from '@/shared/ui/feedback/ToastProvider'
import { showLocalNotification } from '@/services/notifications/localNotification'
import { storageGet, storageSet } from '@/core/safeStorage'
import { cachedSnapshot, saveCached } from '@/core/dataCache'
import { listChecklistOps, queueChecklistOp, applyChecklistOps, subscribeChecklistOutbox } from '@/services/offline/checklistOutbox'
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus'
import { ChecklistIcon, LightbulbIcon, CalendarDotIcon, WarningIcon, ClockIcon, CelebrationIcon, TrashIcon, BookIcon, CheckCircleIcon } from '@/shared/icons/tool-icons'
import type { ChecklistTask } from '@/features/tools/checklist/types'
import { SECTION_GAP } from '@/shared/theme/layout'

const statNumStyle = { fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 30 }

const TASK_GAP = 12

const CHECKLIST_KEY_PREFIX = 'checklist_'

// Removes guest checklists for modules that no longer exist.
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
    // localStorage can throw in private-browsing or storage-full cases.
  }
}

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

function urgencyRank(task: ChecklistTask) {
  if (!task.deadline) return 3
  if (isOverdue(task.deadline)) return 0
  if (isDueSoon(task.deadline)) return 1
  return 2
}

function sortByUrgency(tasks: ChecklistTask[]) {
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
  const online = useOnlineStatus()

  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void

  const pt = getPulseTheme(dark)

  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [tasks, setTasks] = useState<ChecklistTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [savedCopy, setSavedCopy] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncTick, setSyncTick] = useState(0)

  const activeModulesList = (modules as any[]).filter(m => m.status === 'active')
  const selectableModules = activeModulesList.length > 0 ? activeModulesList : (modules as any[])

  useEffect(() => {
    if (!modulesLoaded) return
    if (selectableModules.length === 0) setTasksLoading(false)
    else if (!activeModule) setActiveModule(selectableModules[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesLoaded, modules])

  useEffect(() => {
    if (!modulesLoaded || modulesError) return
    const validIds = new Set((modules as any[]).map(m => m.id))
    pruneOrphanedGuestChecklists(validIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesLoaded, modulesError])

  useEffect(() => subscribeChecklistOutbox(() => setSyncTick(t => t + 1)), [])

  // Keyed on user id, not the session object, so token refreshes don't refetch.
  useEffect(() => {
    if (!activeModule) return
    let ignore = false
    fetchTasks(() => ignore)
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule, user?.id, online])

  useEffect(() => {
    if (syncTick === 0 || !activeModule || !user) return
    let ignore = false
    fetchTasks(() => ignore, true)
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncTick])

  useEffect(() => { setShowCompleted(false) }, [activeModule])

  const cacheKey = () => `user:${user?.id}:checklist:${activeModule}`

  async function fetchTasks(isIgnored: () => boolean = () => false, silent = false) {
    setTasksError(false)
    if (!silent) setTasksLoading(true)
    if (user) {
      const { data, error, fromCache } = await cachedSnapshot(cacheKey(), () => supabase.from('user_checklist')
        .select('*').eq('user_id', user.id).eq('module_id', activeModule).order('created_at'), {
          onUpdate: async fresh => {
            if (isIgnored() || !fresh) return
            const ops = await listChecklistOps(user.id)
            if (isIgnored()) return
            setTasks(applyChecklistOps(fresh as ChecklistTask[], ops, activeModule as string))
            setPendingCount(ops.length)
            setSavedCopy(false)
          },
        })
      const ops = await listChecklistOps(user.id)
      if (isIgnored()) return
      setTasks(applyChecklistOps((data || []) as ChecklistTask[], ops, activeModule as string))
      setSavedCopy(fromCache)
      setPendingCount(ops.length)
      if (error) setTasksError(true)
    } else {
      let saved: ChecklistTask[] = []
      try {
        saved = JSON.parse(storageGet(`checklist_${activeModule}`) || '[]')
      } catch {
        saved = []
      }
      if (isIgnored()) return
      setTasks(saved)
      setSavedCopy(false)
      setPendingCount(0)
    }
    setTasksLoading(false)
  }

  async function sendOp(op: any) {
    const result = await queueChecklistOp(user!.id, op)
    setPendingCount(result.pending)
    if (result.rejected.length > 0) {
      showToast("❌ Couldn't save that change — try again", 'error')
      fetchTasks(() => false, true)
    }
    return result
  }

  async function addTask() {
    if (!newTask.trim() || addingTask) return
    const task: ChecklistTask = {
      id: crypto.randomUUID(), text: newTask.trim(), done: false,
      module_id: activeModule as string, deadline: newDeadline || null
    }
    const updated = [...tasks, task]
    setAddingTask(true)
    setTasks(updated)
    setNewTask('')
    setNewDeadline('')

    if (user) {
      saveCached(cacheKey(), updated)
      const result = await sendOp({ type: 'add', task })
      setAddingTask(false)
      if (result.rejected.length > 0) return
      if (result.pending > 0) showToast("Saved on this device — it will sync when you're online", 'info')
      else showToast('✅ Task added')
      return
    }

    storageSet(`checklist_${activeModule}`, JSON.stringify(updated))
    setAddingTask(false)
    showToast('✅ Task added')
  }

  async function toggleTask(task: ChecklistTask) {
    const updated = tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t)
    setTasks(updated)
    if (user) {
      saveCached(cacheKey(), updated)
      await sendOp({ type: 'toggle', id: task.id, done: !task.done })
    } else {
      storageSet(`checklist_${activeModule}`, JSON.stringify(updated))
    }
  }

  async function deleteTask(task: ChecklistTask) {
    const updated = tasks.filter(t => t.id !== task.id)
    setTasks(updated)
    if (user) {
      saveCached(cacheKey(), updated)
      await sendOp({ type: 'delete', id: task.id })
    } else {
      storageSet(`checklist_${activeModule}`, JSON.stringify(updated))
    }
  }

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    if (tasks.length === 0) return
    const notifyKey = `znu_checklist_last_notify_${activeModule}`
    const todayStr = new Date().toDateString()
    if (storageGet(notifyKey) === todayStr) return

    const urgent = tasks.filter(t => !t.done && (isOverdue(t.deadline) || isDueSoon(t.deadline)))
    if (urgent.length > 0) {
      storageSet(notifyKey, todayStr)
      showLocalNotification('ZNU Future Doctors', {
        body: `You have ${urgent.length} checklist item(s) due soon or overdue.`,
        data: { url: '/checklist' },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks])

  const shownTasks = tasksLoading ? [] : tasks
  const activeTasks = useMemo(() => sortByUrgency(shownTasks.filter(t => !t.done)), [shownTasks])
  const completedTasks = useMemo(() => shownTasks.filter(t => t.done), [shownTasks])

  const doneTasks = completedTasks.length
  const totalTasks = shownTasks.length
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
    <PageShell dark={dark} backFallback="/" maxWidth={900} containerClassName="pulse-wide checklist-page">
      <style>{`
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

      {(modulesError || tasksError) && <ErrorBanner />}

      {(pendingCount > 0 || savedCopy) && (
        <OfflineNote
          dark={dark}
          message={pendingCount > 0
            ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} saved on this device. They'll sync automatically when you reconnect.`
            : "You're offline. You can keep checking items and adding topics — everything syncs when you reconnect."}
        />
      )}

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
          items={selectableModules.map((m: any) => ({
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
              aria-label="Add a topic to study"
              value={newTask} onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              style={inStyle} />
            <button
              onClick={addTask}
              disabled={addingTask}
              className="checklist-add-btn"
              style={{
                background: pt.cobalt, color: '#fff', border: 'none',
                borderRadius: 999, padding: '0 22px', minHeight: 46,
                cursor: addingTask ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14,
                opacity: addingTask ? 0.7 : 1,
                fontFamily: pulseFonts.body
              }}
            >
              {addingTask ? '...' : '+ Add'}
            </button>
          </div>
          <div className="checklist-deadline-row">
            <span style={{ color: pt.faint, fontSize: 12, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <CalendarDotIcon color={pt.faint} size={13} /> Deadline (optional):
            </span>
            <input type="date" aria-label="Deadline (optional)" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} style={{ ...inStyle }} />
          </div>
        </LiquidGlassCard>
      </div>

      {(!modulesLoaded || tasksLoading) && <ChecklistSkeleton />}

      {modulesLoaded && !tasksLoading && totalTasks === 0 && !tasksError && (
        <LiquidGlassCard dark={dark} delay={200} style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            No tasks yet — add topics you need to study! <BookIcon color={pt.sub} size={15} />
          </p>
        </LiquidGlassCard>
      )}

      {activeTasks.map((task, i) => (
        <div key={task.id} style={{ marginBottom: i === activeTasks.length - 1 ? 0 : TASK_GAP }}>
          {renderTaskRow(task, 240 + i * 90)}
        </div>
      ))}

      {modulesLoaded && totalTasks > 0 && activeTasks.length === 0 && (
        <LiquidGlassCard dark={dark} delay={200} style={{ padding: 32, textAlign: 'center', marginBottom: TASK_GAP }}>
          <p style={{ color: pt.cobalt, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <CelebrationIcon color={pt.cobalt} size={16} /> Everything's checked off!
          </p>
        </LiquidGlassCard>
      )}

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
    </PageShell>
  )
}
