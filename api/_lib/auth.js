// api/_lib/auth.js

// Matches a UUID string (tracking tokens and question ids sent by the browser).
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Verifies the caller's Supabase token and admin role. Sends the 401/403 response and returns null
// when the caller is not an admin; otherwise returns the signed-in user.
export async function requireAdmin(req, res, supabase) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'Missing auth token' })
    return null
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    res.status(401).json({ error: 'Invalid session' })
    return null
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single()
  if (profile?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return null
  }

  return userData.user
}
