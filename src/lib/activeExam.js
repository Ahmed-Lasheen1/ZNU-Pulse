import { supabase } from '../supabase'
import { getGuestActiveExam, saveGuestActiveExam, clearGuestActiveExam } from './reviewStorage'

// Paused-exam persistence: Supabase for signed-in users, localStorage for guests.
export async function loadSavedActiveExam(user) {
  if (user) {
    const { data } = await supabase.from('active_exams').select('exam_data').eq('user_id', user.id).maybeSingle()
    return data?.exam_data || null
  }
  return getGuestActiveExam()
}

// Existence only (Home's "continue" card) — avoids downloading the whole exam.
export async function hasSavedActiveExam(user) {
  if (!user) return !!getGuestActiveExam()
  const { count } = await supabase
    .from('active_exams')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  return (count || 0) > 0
}

export async function persistActiveExam(user, payload) {
  if (user) {
    await supabase.from('active_exams').upsert(
      { user_id: user.id, exam_data: payload, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  } else {
    saveGuestActiveExam(payload)
  }
}

export async function clearActiveExam(user) {
  if (user) await supabase.from('active_exams').delete().eq('user_id', user.id)
  else clearGuestActiveExam()
}
