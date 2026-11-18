const RETRY_AFTER_MS = 10 * 60 * 1000

let granted = false
let lastAttemptAt = 0

// Asks the browser not to evict this site's storage (queued exam attempts, checklist changes, cached content).
// Chrome, Android and Firefox may grant it; iOS Safari always refuses, where installing to the Home Screen is the only protection.
// Safe to call often: it stops once granted and retries a refusal at most every 10 minutes.
export async function requestPersistentStorage() {
  if (granted || Date.now() - lastAttemptAt < RETRY_AFTER_MS) return granted
  lastAttemptAt = Date.now()
  try {
    if (!navigator.storage?.persist) return false
    granted = (await navigator.storage.persisted?.()) || (await navigator.storage.persist())
  } catch {
    granted = false
  }
  return granted
}
