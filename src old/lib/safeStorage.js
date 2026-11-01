// localStorage that never throws (blocked storage, quota, private mode).
export function storageGet(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

export function storageSet(key, value) {
  try { localStorage.setItem(key, value); return true } catch { return false }
}

export function storageRemove(key) {
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}
