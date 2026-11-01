import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbgfupgwmgvvrrzuawpo.supabase.co'
const supabaseKey = 'sb_publishable_sRkT46SRWK8SDMdLsz-CGg_A1vHAd6B'

// Same value supabase-js derives by default; explicit so App.jsx can read the saved session offline.
export const AUTH_STORAGE_KEY = 'sb-rbgfupgwmgvvrrzuawpo-auth-token'

// flowType: 'pkce' makes OAuth (Google sign-in) return the session via
// a ?code=... query param instead of a #access_token=... URL hash.
// The hash-based (implicit) flow left a stray "/#" in the address bar
// after sign-in even once Supabase had already consumed it — PKCE
// avoids that and is also the more secure flow (recommended default
// for browser apps in Supabase's own docs).
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce',
    storageKey: AUTH_STORAGE_KEY,
  },
})
