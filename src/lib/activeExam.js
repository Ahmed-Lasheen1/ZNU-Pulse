import { supabase } from '../supabase'
import { idbGet, idbSet, idbDelete } from './idb'
import { getGuestActiveExam, saveGuestActiveExam, clearGuestActiveExam } from './reviewStorage'

const localKey = user => `active-exam:${user.id}`

// Paused-exam persistence. Signed-in users keep a copy on the device so progress
// survives reloads without a connection; it is uploaded whenever possible.
// Guests use localStorage.
export async function loadSavedActiveExam(user) {
  if (!user) return getGuestActiveExam()

  const local = await idbGet(localKey(user))
  const { data, error } = await supabase.from('active_exams').select('exam_data').eq('user_id', user.id).maybeSingle()
  if (error) return local?.payload ?? null

  const remote = data?.exam_data ?? null
  if (local?.cleared) {
    if (remote && remote.savedAt > local.clearedAt) {
      idbDelete(localKey(user))
      return remote
    }
    await clearActiveExam(user)
    return null
  }
  if (!local) return remote
  if (!remote) {
    if (local.synced) {
      idbDelete(localKey(user))
      return null
    }
    return local.payload
  }
  return local.payload.savedAt > remote.savedAt ? local.payload : remote
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

export async function persistActiveExam(user, payload) {
  if (!user) {
    saveGuestActiveExam(payload)
    return
  }
  const key = localKey(user)
  await idbSet(key, { payload, synced: false })
  const { error } = await supabase.from('active_exams').upsert(
    { user_id: user.id, exam_data: payload, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) return
  const current = await idbGet(key)
  if (current?.payload?.savedAt === payload.savedAt) await idbSet(key, { payload, synced: true })
}

export async function clearActiveExam(user) {
  if (!user) {
    clearGuestActiveExam()
    return
  }
  const key = localKey(user)
  await idbSet(key, { cleared: true, clearedAt: Date.now() })
  const { error } = await supabase.from('active_exams').delete().eq('user_id', user.id)
  if (!error) await idbDelete(key)
}
