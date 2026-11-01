import { supabase } from '../supabase'
import { idbGet, idbSet, idbDelete, idbKeys } from './idb'
import { fetchModuleQuestions } from './moduleContent'
import { getGuestActiveExam, saveGuestActiveExam, clearGuestActiveExam } from './reviewStorage'

const LOCAL_PREFIX = 'active-exam:'
const localKey = user => `${LOCAL_PREFIX}${user.id}`
const SERVER_SAVE_INTERVAL_MS = 30000
const REMOTE_TTL_MS = 5 * 60 * 1000

let pending = null
let timer = null
let lastServerSave = 0
let epoch = 0
let remoteMemo = null
let remoteInFlight = null

function toServerPayload(payload) {
  const { quizQuestions, ...rest } = payload
  return { ...rest, quizQuestionIds: (quizQuestions || []).map(q => q.id) }
}

function fetchRemoteExam(user) {
  if (remoteMemo?.userId === user.id && Date.now() - remoteMemo.at < REMOTE_TTL_MS) {
    return Promise.resolve({ data: remoteMemo.data, error: null })
  }
  if (remoteInFlight?.userId === user.id) return remoteInFlight.promise
  const mine = epoch
  const promise = Promise.resolve(
    supabase.from('active_exams').select('exam_data').eq('user_id', user.id).maybeSingle()
  )
    .then(({ data, error }) => {
      if (remoteInFlight?.promise === promise) remoteInFlight = null
      if (error) return { data: null, error }
      const exam = data?.exam_data ?? null
      if (mine === epoch) remoteMemo = { userId: user.id, data: exam, at: Date.now() }
      return { data: exam, error: null }
    })
    .catch(error => {
      if (remoteInFlight?.promise === promise) remoteInFlight = null
      return { data: null, error }
    })
  remoteInFlight = { userId: user.id, promise }
  return promise
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
// from the cached question bank on load. Guests use localStorage. The server copy is
// read at most once every 5 minutes per user and updated in memory on every save/clear.
export async function loadSavedActiveExam(user) {
  if (!user) return getGuestActiveExam()

  const local = await idbGet(localKey(user))
  const { data: remote, error } = await fetchRemoteExam(user)
  if (error) return local?.payload ?? null

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

// Existence only (Home's "continue" card) — shares the same memoized server read.
export async function hasSavedActiveExam(user) {
  if (!user) return !!getGuestActiveExam()

  const local = await idbGet(localKey(user))
  if (local?.cleared) return false
  if (local && !local.synced) return true
  const { data, error } = await fetchRemoteExam(user)
  return error ? !!local : !!data
}

async function uploadActiveExam({ user, payload }) {
  lastServerSave = Date.now()
  const mine = epoch
  const { error } = await supabase.from('active_exams').upsert(
    { user_id: user.id, exam_data: toServerPayload(payload), updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) return
  if (mine === epoch) remoteMemo = { userId: user.id, data: toServerPayload(payload), at: Date.now() }
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
  remoteMemo = null
  remoteInFlight = null
  if (!user) {
    clearGuestActiveExam()
    return
  }
  const key = localKey(user)
  await idbSet(key, { cleared: true, clearedAt: Date.now() })
  const { error } = await supabase.from('active_exams').delete().eq('user_id', user.id)
  if (!error) {
    remoteMemo = { userId: user.id, data: null, at: Date.now() }
    await idbDelete(key)
  }
}

export async function removeSyncedLocalExams() {
  remoteMemo = null
  remoteInFlight = null
  const keys = await idbKeys()
  const examKeys = keys.filter(key => typeof key === 'string' && key.startsWith(LOCAL_PREFIX))
  await Promise.all(examKeys.map(async key => {
    const record = await idbGet(key)
    if (record?.synced === true) await idbDelete(key)
  }))
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushActiveExam() })
  window.addEventListener('pagehide', () => { flushActiveExam() })
}
