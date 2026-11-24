import { supabase, AUTH_STORAGE_KEY } from '@/core/supabase'
import { storageGetJson } from '@/core/safeStorage'
import { containsProfanity } from '@/shared/utils/moderation'

// Reads the signed-in user from the saved session (used when offline).
export function readStoredUser() {
  return storageGetJson(AUTH_STORAGE_KEY, null)?.user ?? null
}

const ensureProfileInFlight = new Set()

// Creates the user's profile row on first sign-in.
export async function ensureProfile(user) {
  if (ensureProfileInFlight.has(user.id)) return
  ensureProfileInFlight.add(user.id)
  try {
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (existing) return
    const meta = user.user_metadata || {}
    const raw = (meta.full_name || meta.name || '').trim().slice(0, 60)
    const name = raw && !containsProfanity(raw) ? raw : 'Student'
    let { error } = await supabase.from('profiles').insert([{ id: user.id, name, points: 0 }])
    if (error && name !== 'Student') {
      ({ error } = await supabase.from('profiles').insert([{ id: user.id, name: 'Student', points: 0 }]))
    }
    if (error) console.warn('[ensureProfile] Could not create profile row:', error.message)
  } catch (e) {
    console.warn('[ensureProfile] Unexpected error:', e)
  } finally {
    ensureProfileInFlight.delete(user.id)
  }
}
