// src/components/GuestSignInButton.jsx
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { getPulseTheme, ON_GRADIENT_TOP } from '../premiumTheme'
import { useAuth } from '../contexts'
import { useLimitedAppearance } from '../lib/useLimitedAppearance'

// Same reload budget as NotifyPermissionButton (see useLimitedAppearance)
// — deliberately identical, per design decision: a guest gets nudged
// toward signing in on the first few page loads, then this disappears
// for good. Signing in is never actually blocked by that — it's one
// tap away in the nav menu (and via the "Sign In" row there) at any
// time, so there's no need to keep re-asking once the person hasn't
// bitten in the first few visits.
const MAX_PROMPT_SHOWS = 3

export default function GuestSignInButton({ dark }) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const { user, authLoaded } = useAuth()

  // Guard on authLoaded so a guest's budget isn't accidentally spent
  // during the brief window before the initial session check
  // resolves (see App.jsx's authLoaded) — otherwise a signed-in user
  // could flash this for a frame on every load and eat into a count
  // that should only ever apply to actual guests.
  const wouldShow = authLoaded && !user
  const allowedByBudget = useLimitedAppearance('znu_guest_cta', wouldShow, MAX_PROMPT_SHOWS)

  if (!wouldShow || !allowedByBudget) return null

  return (
    <button onClick={() => navigate('/auth')} style={{
      background: 'transparent', border: `1px solid ${pt.border}`, borderRadius: 20,
      padding: '6px 16px', color: ON_GRADIENT_TOP.secondary, cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 auto 16px',
    }}>
      <LogIn size={13} color={ON_GRADIENT_TOP.secondary} />
      Get started — sign in or create an account
    </button>
  )
}
