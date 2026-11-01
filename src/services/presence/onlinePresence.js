import { supabase } from '@/core/supabase'

const CHANNEL_NAME = 'znu-online-presence'

let channel = null
let refCount = 0
let syncListeners = []

// Returns the shared presence channel, creating it on first use.
function safeGetChannel() {
  try {
    if (!channel) {
      channel = supabase.channel(CHANNEL_NAME, {
        config: { presence: { key: crypto.randomUUID() } }
      })
      channel.on('presence', { event: 'sync' }, () => syncListeners.forEach(fn => fn()))
    }
    return channel
  } catch (e) {
    console.warn('[onlinePresence] Could not create channel:', e)
    return null
  }
}

// Subscribes to the channel unless it is already joined.
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

// Announces this tab as online; returns a function that leaves the channel.
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
      }
    } catch { /* noop */ }
  }
}

// Reports how many tabs are online now and on every change; returns a stop function.
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
