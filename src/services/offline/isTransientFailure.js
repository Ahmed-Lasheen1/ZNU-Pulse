// Retryable: no connection, server errors, expired/invalid session, or permission denied
// (the anon fallback when the token has expired). The attempt stays pending.
export const isTransientFailure = ({ error, status }) => {
  if (!error) return false
  if (status === 0 || status >= 500) return true
  return status === 401 || status === 403 || error.code === '42501'
}
