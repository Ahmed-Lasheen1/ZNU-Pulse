import { useState, useRef, useEffect, type CSSProperties, type ReactNode, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search as SearchIcon } from 'lucide-react'
import { useAuth } from '../contexts'
import { MenuToggleIcon } from './ui/menu-toggle-icon'
import ThemeSwitch from './ui/theme-switch'
import { HomeIcon, ScheduleIcon, ChecklistIcon, AnonQAIcon, LeaderboardIcon, BookIcon, SignOutIcon, UserIcon, StarIcon } from './ui/tool-icons'
import { getPulseTheme, pulseFonts } from '../premiumTheme'
import { glassInput } from './pulse/PulseUI'
import { liquidGlassShadow, liquidGlassBackdrop, liquidGlassTint } from '../lib/liquidGlass'
import PulseGlassRow from './pulse/PulseGlassRow'
import ConfirmDialog from './ConfirmDialog'

type PulseTheme = ReturnType<typeof getPulseTheme>
type Align = 'left' | 'right'

interface AuthUser {
  id: string
  email?: string
}
interface AuthProfile {
  name?: string | null
  points?: number | null
  role?: string | null
}

interface NavItem {
  label: string
  href: string
  Icon: (props: { color: string; size?: number }) => JSX.Element
  accent: 'cobalt' | 'indigo' | 'amber'
}

// Nav destinations — icon/accent pairing mirrors Home's own tool cards.
const navItems: NavItem[] = [
  { label: 'Home', href: '/', Icon: HomeIcon, accent: 'cobalt' },
  { label: 'Schedules', href: '/schedule', Icon: ScheduleIcon, accent: 'indigo' },
  { label: 'Checklist', href: '/checklist', Icon: ChecklistIcon, accent: 'amber' },
  { label: 'Anonymous Q&A', href: '/anon-questions', Icon: AnonQAIcon, accent: 'indigo' },
  { label: 'Leaderboard', href: '/profile?tab=leaderboard', Icon: LeaderboardIcon, accent: 'amber' },
  { label: 'Review', href: '/review', Icon: BookIcon, accent: 'indigo' },
]

// ── Layout constants ─────────────────────────────────────────────────
const BUTTON_SIZE = 44
const PANEL_WIDTH = 280
const PANEL_RADIUS = 24
const ROW_RADIUS = 16
// Fixed-width icon column before "Dr. Name" / points, so both lines of
// the profile row start their text at the same x offset.
const PROFILE_ICON_COL = 16
// Non-uniform scale target for the closed panel (matches BUTTON_SIZE on
// width only — scaling both axes down to a square would distort the
// panel's own border-radius into an ellipse mid-transition).
const CLOSED_SCALE = BUTTON_SIZE / PANEL_WIDTH
// Caps panel height on short viewports (landscape phones, foldables) so
// content scrolls internally rather than being clipped by the outer
// blur container's required `overflow: hidden`.
const PANEL_MAX_HEIGHT = 'calc(100dvh - 140px)'

// ── Animation constants ──────────────────────────────────────────────
const morphEase = [0.22, 1, 0.36, 1] as const
const OPEN_DURATION = 0.6
const CLOSE_DURATION = 0.55

// ── Reduced-motion + shared transition hooks ────────────────────────
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return reduced
}

// Single transition object shared by both the panel and content block's
// animate() calls, so their scale/y and opacity move in exact lockstep.
function useSyncedTransition(open: boolean, reducedMotion: boolean) {
  if (reducedMotion) return { duration: 0.15, ease: 'linear' as const }
  return open
    ? { duration: OPEN_DURATION, ease: morphEase }
    : { duration: CLOSE_DURATION, ease: morphEase }
}

interface LiquidBloomProps {
  pt: PulseTheme
  open: boolean
  align: Align
}

// Soft glass-tinted radial bloom behind the open panel — mounted only
// while open, transform/opacity only.
function LiquidBloom({ pt, open, align }: LiquidBloomProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          aria-hidden
          className="pointer-events-none"
          initial={{ opacity: 0, scale: 0.15 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.4, transition: { duration: CLOSE_DURATION, ease: morphEase } }}
          transition={{ duration: OPEN_DURATION, ease: morphEase, delay: 0.05 }}
          style={{
            position: 'absolute', borderRadius: '50%',
            width: 340, height: 340,
            [align === 'right' ? 'right' : 'left']: -60,
            top: -40,
            background: `radial-gradient(circle, ${pt.cobalt}30, ${pt.indigo}18 55%, transparent 72%)`,
            transformOrigin: align === 'right' ? 'top right' : 'top left',
            willChange: 'transform, opacity',
          } as CSSProperties}
        />
      )}
    </AnimatePresence>
  )
}

interface GlassRowProps {
  dark: boolean
  radius?: number
  style?: CSSProperties
  children: ReactNode
  onClick?: () => void
  role?: string
  tabIndex?: number
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void
  'aria-label'?: string
}

// Local glass-row treatment (shadow/tint/hover) without its own
// backdrop-filter — the panel already applies one real blur, so rows
// don't each need their own independent blur layer. Renders a real
// <button> when interactive for correct keyboard/focus/screen-reader
// behavior.
function GlassRow({ dark, radius = ROW_RADIUS, style = {}, children, onClick, ...rest }: GlassRowProps) {
  const [hovered, setHovered] = useState(false)
  const interactive = !!onClick
  const hoverTint = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'
  const Tag = (interactive ? 'button' : 'div') as any

  return (
    <Tag
      {...rest}
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className="glass-focus-ring"
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
      style={{
        position: 'relative', display: 'block', width: '100%', margin: 0,
        borderRadius: radius, cursor: interactive ? 'pointer' : 'default',
        background: 'transparent', border: 'none', padding: 0,
        font: 'inherit', color: 'inherit', textAlign: 'left',
        ...style,
      }}
    >
      {/* Outward glow lives outside the overflow:hidden layer below so
          it isn't clipped by this row's own rounded-corner mask. */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: liquidGlassShadow(dark), pointerEvents: 'none' }} />
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'inherit' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: liquidGlassTint(dark) }} />
        {hovered && (
          <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: hoverTint }} />
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      </div>
    </Tag>
  )
}

interface NavSearchProps {
  pt: PulseTheme
  dark: boolean
  tabIndex: number
  onSubmit: (query: string) => void
}

// Search field kept as its own component so typing only re-renders
// this input, not the whole menu panel.
function NavSearch({ pt, dark, tabIndex, onSubmit }: NavSearchProps) {
  const [value, setValue] = useState('')

  function submit() {
    onSubmit(value)
    setValue('')
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <SearchIcon size={16} color={pt.faint} style={{ position: 'absolute', left: 16, top: '60%', transform: 'translateY(-60%)', pointerEvents: 'none' }} />
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder="Search..."
        type="search"
        tabIndex={tabIndex}
        style={{
          ...glassInput(pt, dark),
          padding: '13px 18px 13px 42px',
          marginBottom: 0,
          fontSize: 14,
        }}
      />
    </div>
  )
}

interface NavMenuProps {
  dark: boolean
  toggleTheme: () => void
  align?: Align
}

export default function NavMenu({ dark, toggleTheme, align = 'left' }: NavMenuProps) {
  const [open, setOpen] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  // Tracks the animation window so `willChange` is only reserved on the
  // GPU while the panel is actually mid-transition, not permanently.
  const [animating, setAnimating] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth() as {
    user: AuthUser | null
    profile: AuthProfile | null
    signOut: () => Promise<void>
  }
  const wrapperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const triggerButtonRef = useRef<HTMLButtonElement>(null)
  const pt = getPulseTheme(dark)
  const transition = useSyncedTransition(open, reducedMotion)

  // Outside click/tap and Escape close the menu.
  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent | TouchEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEscape(e: KeyboardEvent | globalThis.KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('touchstart', onClickOutside)
    document.addEventListener('keydown', onEscape as EventListener)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('touchstart', onClickOutside)
      document.removeEventListener('keydown', onEscape as EventListener)
    }
  }, [open])

  // Returns keyboard focus to the trigger button once the menu closes.
  useEffect(() => {
    if (!open) {
      triggerButtonRef.current?.focus()
    }
  }, [open])

  // Closes the menu when focus genuinely leaves the panel (e.g. Tabbing
  // past the last row) — skipped when focus is headed back to the
  // trigger button itself, since that button's own onClick already
  // owns the close/reopen toggle in that specific case.
  function handleContentBlur(e: React.FocusEvent<HTMLDivElement>) {
    const next = e.relatedTarget as Node | null
    if (!next) return
    if (next === triggerButtonRef.current) return
    if (!e.currentTarget.contains(next)) setOpen(false)
  }

  function goTo(path: string) { setOpen(false); navigate(path) }

  function submitSearch(query: string) {
    const q = query.trim()
    setOpen(false)
    navigate('/search', q ? { state: { initialQuery: q } } : undefined)
  }

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  const cornerSide: Align = align === 'right' ? 'right' : 'left'

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: BUTTON_SIZE, height: BUTTON_SIZE }}>
      {/* Glass panel — always rendered at its true final size; only
          `scale`/`opacity` animate (both compositor-only), so the
          backdrop-blur is computed once and just re-composited under
          the transform instead of re-blurring every frame.
          `initial={false}` skips playing a bogus close animation on
          mount, since this is unconditionally rendered rather than
          conditionally mounted. Opacity uses a Material "Container
          Transform" keyframe window (confined to the middle third of
          the transition, its own linear curve) rather than tracking
          scale's ease-in-out for the full duration. */}
      <motion.div
        initial={false}
        style={{
          position: 'absolute', top: 0, [cornerSide]: 0,
          width: PANEL_WIDTH,
          maxWidth: '90vw',
          transformOrigin: cornerSide === 'right' ? 'top right' : 'top left',
          pointerEvents: open ? 'auto' : 'none',
          zIndex: 1999,
          willChange: animating ? 'transform, opacity' : 'auto',
          isolation: 'isolate', overflow: 'hidden', borderRadius: PANEL_RADIUS,
          ...liquidGlassBackdrop(),
        } as CSSProperties}
        animate={{
          scale: reducedMotion ? 1 : (open ? 1 : CLOSED_SCALE),
          opacity: open ? [0, 0, 1, 1] : [1, 1, 0, 0],
        }}
        transition={{
          scale: transition,
          opacity: reducedMotion
            ? { duration: 0.15, ease: 'linear' }
            : {
                duration: open ? OPEN_DURATION : CLOSE_DURATION,
                times: [0, 0.35, 0.65, 1],
                ease: 'linear',
              },
        }}
        onAnimationStart={() => setAnimating(true)}
        onAnimationComplete={() => setAnimating(false)}
      >
        <div aria-hidden className="pointer-events-none" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: liquidGlassShadow(dark) }} />
        <div aria-hidden className="pointer-events-none" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: liquidGlassTint(dark) }} />

        <LiquidBloom pt={pt} open={open && !reducedMotion} align={cornerSide} />

        {/* Spacer matching the real trigger button's footprint */}
        <div style={{ height: BUTTON_SIZE }} />

        {/* Content block — shares the panel's exact transition timing
            for y/opacity, scrolls internally within PANEL_MAX_HEIGHT on
            short viewports, and returns focus/closes via handleContentBlur. */}
        <motion.div
          ref={contentRef}
          id="nav-menu-panel"
          aria-label="Site navigation"
          initial={false}
          animate={{ y: reducedMotion ? 0 : (open ? 0 : -16), opacity: open ? [0, 0, 1, 1] : [1, 1, 0, 0] }}
          transition={{
            y: transition,
            opacity: reducedMotion
              ? { duration: 0.15, ease: 'linear' }
              : {
                  duration: open ? OPEN_DURATION : CLOSE_DURATION,
                  times: [0, 0.35, 0.65, 1],
                  ease: 'linear',
                },
          }}
          onBlur={handleContentBlur}
          aria-hidden={!open}
          style={{
            position: 'relative', zIndex: 1, width: PANEL_WIDTH, padding: '8px 14px 16px',
            fontFamily: pulseFonts.body, display: 'flex', flexDirection: 'column', gap: 10,
            maxHeight: PANEL_MAX_HEIGHT, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            willChange: animating ? 'transform, opacity' : 'auto',
          } as CSSProperties}
        >
          {/* Profile / Sign In row */}
          {user ? (
            <GlassRow dark={dark} radius={18} onClick={() => goTo('/profile')} tabIndex={open ? 0 : -1}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: PROFILE_ICON_COL, flexShrink: 0 }}>
                      <UserIcon color={pt.text} size={13} />
                    </span>
                    <span style={{
                      color: pt.text, fontWeight: 800, fontSize: 14, flex: 1, minWidth: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>Dr. {profile?.name || '...'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: pt.amber, fontSize: 12, fontWeight: 700, marginTop: 3 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: PROFILE_ICON_COL, flexShrink: 0 }}>
                      <StarIcon color={pt.amber} size={13} />
                    </span>
                    {profile?.points || 0} points
                  </div>
                </div>
              </div>
            </GlassRow>
          ) : (
            <GlassRow dark={dark} radius={18} onClick={() => goTo('/auth')} tabIndex={open ? 0 : -1}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px', color: '#fff', fontWeight: 800, fontSize: 14,
                background: `linear-gradient(135deg, ${pt.cobalt}cc, ${pt.indigo}cc)`
              }}>Sign In →</div>
            </GlassRow>
          )}

          {/* Search */}
          <NavSearch pt={pt} dark={dark} tabIndex={open ? 0 : -1} onSubmit={submitSearch} />

          {/* Navigation items */}
          {navItems.map(item => {
            const Icon = item.Icon
            const iconColor = pt[item.accent] || pt.text
            return (
              <GlassRow key={item.href} dark={dark} radius={16} onClick={() => goTo(item.href)} tabIndex={open ? 0 : -1}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' }}>
                  <Icon color={iconColor} size={17} />
                  <span style={{ color: pt.text, fontWeight: item.href === '/' ? 800 : 600, fontSize: 14, fontFamily: 'inherit' }}>
                    {item.label}
                  </span>
                </div>
              </GlassRow>
            )
          })}

          {/* Theme switch */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
            <ThemeSwitch dark={dark} onToggle={toggleTheme} scale={0.62} stretchX={1.3} />
          </div>

          {/* Sign out */}
          {user && (
            <GlassRow dark={dark} radius={16} onClick={() => setShowSignOutConfirm(true)} tabIndex={open ? 0 : -1}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px' }}>
                <SignOutIcon color={pt.danger} size={17} />
                <span style={{ color: pt.danger, fontSize: 14, fontWeight: 700 }}>Sign Out</span>
              </div>
            </GlassRow>
          )}
        </motion.div>
      </motion.div>

      <ConfirmDialog
        dark={dark}
        open={showSignOutConfirm}
        title="Sign out?"
        message="You'll need to sign in again to see your progress and points."
        confirmLabel="Sign Out"
        confirmColor={pt.danger}
        onCancel={() => setShowSignOutConfirm(false)}
        onConfirm={async () => {
          setShowSignOutConfirm(false)
          await handleSignOut()
        }}
      />

      {/* Real toggle button — fixed 44x44, stacked above the glass panel
          so it stays crisp throughout the open/close motion. */}
      <div style={{
        position: 'absolute', top: 0, [cornerSide]: 0,
        width: BUTTON_SIZE, height: BUTTON_SIZE, zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <motion.button
          ref={triggerButtonRef}
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls="nav-menu-panel"
          whileHover={!open && !reducedMotion ? { scale: 1.06 } : undefined}
          whileTap={reducedMotion ? undefined : { scale: 0.88 }}
          transition={{ duration: 0.15, ease: morphEase }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44, flexShrink: 0, padding: 0,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            outline: 'none'
          }}
        >
          <MenuToggleIcon open={open} width={44} height={44} stroke={dark ? '#010c4a' : '#010c4a'} duration={400} />
        </motion.button>
      </div>
    </div>
  )
}
