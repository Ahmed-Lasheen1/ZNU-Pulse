import { supabase } from '../supabase'

// "Who's online right now" for Admin Analytics, via Supabase Realtime
// Presence — no table needed.
const CHANNEL_NAME = 'znu-online-presence'

let channel = null
let refCount = 0
let syncListeners = []
let syncAttached = false

function safeGetChannel() {
  try {
    if (!channel) {
      channel = supabase.channel(CHANNEL_NAME, {
        config: { presence: { key: crypto.randomUUID() } }
      })
    }
    return channel
  } catch (e) {
    console.warn('[onlinePresence] Could not create channel:', e)
    return null
  }
}

function safeSubscribe(ch, onStatus) {
  if (!ch) return
  try {
    if (ch.state === 'joined' || ch.state === 'joining') {
      onStatus?.('SUBSCRIBED')
      return
    }
    ch.subscribe((status) => {
      try { onStatus?.(status) } catch { /* ignore */ }
    })
  } catch (e) {
    console.warn('[onlinePresence] Could not subscribe:', e)
  }
}

// Call once when the app mounts so every visitor — signed in or guest
// — counts. Safe to call more than once; reuses the same channel.
export function subscribeOnlinePresence() {
  try {
    const ch = safeGetChannel()
    refCount++
    safeSubscribe(ch, async (status) => {
      if (status === 'SUBSCRIBED' && ch) {
        try { await ch.track({ online_at: new Date().toISOString() }) } catch { /* non-critical */ }
      }
    })
  } catch (e) {
    console.warn('[onlinePresence] subscribeOnlinePresence failed:', e)
  }

  return () => {
    try {
      refCount = Math.max(0, refCount - 1)
      if (refCount === 0 && channel) {
        supabase.removeChannel(channel)
        channel = null
        syncListeners = []
        syncAttached = false
      }
    } catch { /* noop */ }
  }
}

// Used by Admin Analytics to read the live count and get notified on
// every join/leave. Multiple callers share one real 'sync' subscription
// on the channel; each caller just registers/unregisters its own
// callback in syncListeners, so switching tabs repeatedly doesn't pile
// up duplicate listeners on the shared channel.
export function watchOnlineCount(onCount) {
  let cancelled = false

  function report() {
    if (cancelled) return
    try {
      const state = channel?.presenceState()
      onCount(Object.keys(state || {}).length)
    } catch {
      if (!cancelled) onCount(0)
    }
  }

  try {
    const ch = safeGetChannel()
    if (!ch) { onCount(0); return () => {} }

    syncListeners.push(report)
    if (!syncAttached) {
      syncAttached = true
      try {
        ch.on('presence', { event: 'sync' }, () => syncListeners.forEach(fn => fn()))
      } catch (e) {
        console.warn('[onlinePresence] Could not attach presence listener:', e)
      }
    }

    safeSubscribe(ch, report)
    report()
  } catch (e) {
    console.warn('[onlinePresence] watchOnlineCount failed:', e)
    onCount(0)
    return () => {}
  }

  return () => {
    cancelled = true
    syncListeners = syncListeners.filter(fn => fn !== report)
  }
}
