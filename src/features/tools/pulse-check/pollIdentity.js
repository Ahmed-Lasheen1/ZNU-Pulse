import { storageGet, storageSet } from '@/core/safeStorage'

const KEY = 'znu_poll_guest_token'

// Guests vote under a per-device token; signed-in users vote under their account on the server.
export function getGuestToken() {
  let token = storageGet(KEY)
  if (!token) {
    token = crypto.randomUUID()
    storageSet(KEY, token)
  }
  return token
}
