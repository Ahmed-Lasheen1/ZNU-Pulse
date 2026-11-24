// localStorage that never throws (blocked storage, quota, private mode).
export function storageGet(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

// Writes a localStorage value; returns false when storage is unavailable.
export function storageSet(key, value) {
  try { localStorage.setItem(key, value); return true } catch { return false }
}

// Removes a localStorage key, ignoring storage errors.
export function storageRemove(key) {
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}

// Reads a JSON value; returns the fallback when the key is missing, unreadable or malformed.
export function storageGetJson(key, fallback = null) {
  try {
    const raw = storageGet(key)
    return raw === null ? fallback : (JSON.parse(raw) ?? fallback)
  } catch {
    return fallback
  }
}

// Writes a value as JSON; returns false when storage is unavailable or the value cannot be serialized.
export function storageSetJson(key, value) {
  try { return storageSet(key, JSON.stringify(value)) } catch { return false }
}

// Reads a saved list of ids as a Set (empty when missing or malformed).
export function storageGetSet(key) {
  const list = storageGetJson(key, [])
  return new Set(Array.isArray(list) ? list : [])
}
