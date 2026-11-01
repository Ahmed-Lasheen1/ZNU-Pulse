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
