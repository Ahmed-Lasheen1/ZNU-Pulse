import { supabase } from '@/core/supabase'

const CHANNEL_NAME = 'znu-online-presence'

let channel = null
let syncListeners = []
// Resolves once the previous channel is fully removed, so a new channel never reuses a closing one.
let pendingRemoval = Promise.resolve()

// Creates the presence channel; only a listening channel is sent the other tabs' presence updates.
function createChannel(listen) {
  const ch = supabase.channel(CHANNEL_NAME, {
    config: { presence: { key: crypto.randomUUID(), enabled: listen } }
  })
  if (listen) ch.on('presence', { event: 'sync' }, () => syncListeners.forEach(fn => fn()))
  return ch
}

// Announces this tab as online and returns a function that leaves the channel.
// `listen` should be true only for admins, who need the live count; other tabs just announce themselves.
export function subscribeOnlinePresence({ listen = false } = {}) {
  let cancelled = false
  let own = null

  pendingRemoval.then(() => {
    if (cancelled) return
    try {
      own = createChannel(listen)
      channel = own
      const joined = own
      joined.subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return
        try { await joined.track({ online_at: new Date().toISOString() }) } catch { /* non-critical */ }
      })
    } catch (e) {
      console.warn('[onlinePresence] Could not join the channel:', e)
    }
  })

  return () => {
    cancelled = true
    const leaving = own
    own = null
    if (!leaving) return
    if (channel === leaving) channel = null
    pendingRemoval = Promise.resolve(supabase.removeChannel(leaving)).catch(() => {})
  }
}

// Reports how many tabs are online now and on every change (admins only; others see 0); returns a stop function.
export function watchOnlineCount(onCount) {
  let cancelled = false

  // Reads the current number of online tabs from the channel's presence state.
  function report() {
    if (cancelled) return
    try {
      onCount(Object.keys(channel?.presenceState() || {}).length)
    } catch {
      onCount(0)
    }
  }

  syncListeners.push(report)
  report()

  return () => {
    cancelled = true
    syncListeners = syncListeners.filter(fn => fn !== report)
  }
}
