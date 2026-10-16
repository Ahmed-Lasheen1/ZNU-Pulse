import { supabase } from '../supabase'
import { idbGet, idbSet, idbDelete } from './idb'
import { fetchModuleQuestions } from './moduleContent'
import { getGuestActiveExam, saveGuestActiveExam, clearGuestActiveExam } from './reviewStorage'

const localKey = user => `active-exam:${user.id}`
const SERVER_SAVE_INTERVAL_MS = 30000

let pending = null
let timer = null
let lastServerSave = 0
let epoch = 0

function toServerPayload(payload) {
  const { quizQuestions, ...rest } = payload
  return { ...rest, quizQuestionIds: (quizQuestions || []).map(q => q.id) }
}

async function hydrateExam(exam) {
  if (!exam || exam.quizQuestions) return exam
  const ids = exam.quizQuestionIds
  if (!Array.isArray(ids) || !exam.activeModule) return null
  const { data } = await fetchModuleQuestions(exam.activeModule)
  const byId = new Map((data || []).map(q => [q.id, q]))
  const quizQuestions = ids.map(id => byId.get(id))
  if (quizQuestions.some(q => !q)) return null
  const { quizQuestionIds, ...rest } = exam
  return { ...rest, quizQuestions }
}

// Paused-exam persistence. Signed-in users keep a full copy on the device so progress
// survives reloads without a connection; the server copy stores only question ids and
// answers, is uploaded at most every 30s (and when the page is hidden), and is rebuilt
// from the cached question bank on load. Guests use localStorage.
export async function loadSavedActiveExam(user) {
  if (!user) return getGuestActiveExam()

  const local = await idbGet(localKey(user))
  const { data, error } = await supabase.from('active_exams').select('exam_data').eq('user_id', user.id).maybeSingle()
  if (error) return local?.payload ?? null

  const remote = data?.exam_data ?? null
  if (local?.cleared) {
    if (remote && remote.savedAt > local.clearedAt) {
      idbDelete(localKey(user))
      return hydrateExam(remote)
    }
    await clearActiveExam(user)
    return null
  }
  if (!local) return hydrateExam(remote)
  if (!remote) {
    if (local.synced) {
      idbDelete(localKey(user))
      return null
    }
    return local.payload
  }
  return local.payload.savedAt > remote.savedAt ? local.payload : hydrateExam(remote)
}

// Existence only (Home's "continue" card) — avoids downloading the whole exam.
export async function hasSavedActiveExam(user) {
  if (!user) return !!getGuestActiveExam()

  const local = await idbGet(localKey(user))
  if (local?.cleared) return false
  if (local && !local.synced) return true
  const { count, error } = await supabase
    .from('active_exams')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  return error ? !!local : (count || 0) > 0
}

async function uploadActiveExam({ user, payload }) {
  lastServerSave = Date.now()
  const { error } = await supabase.from('active_exams').upsert(
    { user_id: user.id, exam_data: toServerPayload(payload), updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) return
  const key = localKey(user)
  const current = await idbGet(key)
  if (current?.payload?.savedAt === payload.savedAt) await idbSet(key, { payload, synced: true })
}

export function flushActiveExam() {
  clearTimeout(timer)
  timer = null
  const job = pending
  pending = null
  return job ? uploadActiveExam(job) : Promise.resolve()
}

export async function persistActiveExam(user, payload) {
  if (!user) {
    saveGuestActiveExam(payload)
    return
  }
  const mine = epoch
  await idbSet(localKey(user), { payload, synced: false })
  if (mine !== epoch) return
  pending = { user, payload }
  const wait = lastServerSave + SERVER_SAVE_INTERVAL_MS - Date.now()
  if (wait <= 0) await flushActiveExam()
  else if (!timer) timer = setTimeout(flushActiveExam, wait)
}

export async function clearActiveExam(user) {
  clearTimeout(timer)
  timer = null
  pending = null
  epoch++
  if (!user) {
    clearGuestActiveExam()
    return
  }
  const key = localKey(user)
  await idbSet(key, { cleared: true, clearedAt: Date.now() })
  const { error } = await supabase.from('active_exams').delete().eq('user_id', user.id)
  if (!error) await idbDelete(key)
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushActiveExam() })
  window.addEventListener('pagehide', () => { flushActiveExam() })
}
