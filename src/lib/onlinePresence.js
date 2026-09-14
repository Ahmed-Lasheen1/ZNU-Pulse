import { supabase } from '../supabase'

// "Who's online right now" for Admin Analytics, via Supabase Realtime
// Presence — no table needed. Every function is wrapped in try/catch:
// this is a nice-to-have stat, and nothing here should ever crash the
// page it's shown on.
const CHANNEL_NAME = 'znu-online-presence'

let channel = null
let refCount = 0

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
      }
    } catch { /* noop */ }
  }
}

// Used by Admin Analytics to read the live count and get notified on
// every join/leave. Every step is guarded — worst case reports 0.
//
// BUG FIX: the channel's 'presence' listener used to be attached with
// no way to ever stop it — the returned cleanup was a bare `() => {}`.
// Since the underlying channel is a module-level singleton shared
// across mounts (see refCount above), every time AnalyticsTab mounted
// (switching tabs, leaving, coming back) it registered ANOTHER
// listener that kept calling `onCount` — a state setter belonging to
// a component instance that may already be unmounted — forever. The
// `cancelled` flag below is checked inside `report()` so a caller's
// cleanup actually silences its own callback instead of leaking it.
export function watchOnlineCount(onCount) {
  let cancelled = false

  try {
    const ch = safeGetChannel()
    if (!ch) { onCount(0); return () => {} }

    function report() {
      if (cancelled) return
      try {
        const state = ch.presenceState()
        onCount(Object.keys(state || {}).length)
      } catch {
        if (!cancelled) onCount(0)
      }
    }

    try {
      ch.on('presence', { event: 'sync' }, report)
    } catch (e) {
      console.warn('[onlinePresence] Could not attach presence listener:', e)
    }

    safeSubscribe(ch, report)
    report()
  } catch (e) {
    console.warn('[onlinePresence] watchOnlineCount failed:', e)
    onCount(0)
    return () => {}
  }

  return () => { cancelled = true }
}
