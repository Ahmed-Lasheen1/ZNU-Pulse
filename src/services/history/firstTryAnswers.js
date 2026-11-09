import { supabase } from '@/core/supabase'
import { fetchAllRows } from '@/core/fetchAllRows'
import { cachedQuery, invalidateCache, MINUTE } from '@/core/dataCache'

const FIRST_TRY_TTL = 5 * MINUTE

// "user:" prefix so sign-out clears this cache with the other per-user caches.
const keyFor = userId => `user:${userId}:first-try-answers`

// Loads the student's very first answer to each question ({ question_id, correct }), cached for a few minutes.
// The server never overwrites these rows, so they describe first-try accuracy only. Guests get an empty list.
export async function loadFirstTryAnswers(userId) {
  if (!userId) return { rows: [], error: null }
  const { data, error } = await cachedQuery(
    keyFor(userId),
    () => fetchAllRows(() => supabase
      .from('answered_questions')
      .select('question_id, correct')
      .eq('user_id', userId)
      .order('question_id')),
    { ttl: FIRST_TRY_TTL }
  )
  return { rows: data || [], error }
}

// Clears the cached first-try answers so the next read includes questions answered since.
export function invalidateFirstTryAnswers(userId) {
  if (userId) invalidateCache(keyFor(userId))
}
