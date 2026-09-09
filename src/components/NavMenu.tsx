import { useState, useRef, useEffect, type CSSProperties, type ReactNode, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search as SearchIcon } from 'lucide-react'
import { useAuth } from '../contexts'
import { MenuToggleIcon } from './ui/menu-toggle-icon'
import ThemeSwitch from './ui/theme-switch'
import { HomeIcon, ScheduleIcon, ChecklistIcon, AnonQAIcon, LeaderboardIcon, BookIcon, SignOutIcon } from './ui/tool-icons'
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

// Same morph curve the liquid floating-menu reference uses.
const morphEase = [0.22, 1, 0.36, 1] as const

interface NavItem {
  label: string
  href: string
  Icon: (props: { color: string; size?: number }) => JSX.Element
  accent: 'cobalt' | 'indigo' | 'amber'
}

// Same icon set Home.tsx's own tool cards use for these four, plus a
// freshly-built HomeIcon (see tool-icons.tsx) for the one item that
// didn't have a matching glyph anywhere yet. `accent` mirrors Home's
// own accent assignment per card (indigo/amber alternating) so the
// menu's colors read as the same system, not a new one.
//
// Review uses the same BookIcon Review.tsx's own page header already
// uses (via PageIntro), so the nav entry visually matches the page it
// links to.
const navItems: NavItem[] = [
  { label: 'Home', href: '/', Icon: HomeIcon, accent: 'cobalt' },
  { label: 'Schedules', href: '/schedule', Icon: ScheduleIcon, accent: 'indigo' },
  { label: 'Checklist', href: '/checklist', Icon: ChecklistIcon, accent: 'amber' },
  { label: 'Anonymous Q&A', href: '/anon-questions', Icon: AnonQAIcon, accent: 'indigo' },
  { label: 'Leaderboard', href: '/profile?tab=leaderboard', Icon: LeaderboardIcon, accent: 'amber' },
  { label: 'Review', href: '/review', Icon: BookIcon, accent: 'indigo' },
]

const BUTTON_SIZE = 44
const PANEL_WIDTH = 280
const PANEL_RADIUS = 24
const ROW_RADIUS = 16
// How far the closed panel is shrunk relative to its true (always-on)
// layout size. Deliberately not matching BUTTON_SIZE exactly on both
// axes — a non-uniform scale that forces a 280-wide box down to a
// perfect 44x44 would squash its border-radius into an ellipse. This
// just needs to get small/fast enough that it's fully hidden (opacity
// 0) under the real toggle button by the time it matters.
const CLOSED_SCALE = BUTTON_SIZE / PANEL_WIDTH

// Open/close durations. Close was 0.4s originally, which — combined
// with the panel's blur visually shrinking as it scales down — made
// it read as "vanishing" rather than closing.
const OPEN_DURATION = 0.6
const CLOSE_DURATION = 0.55
// On open, opacity reaches 1 well before the scale finishes growing.
// See the panel's `animate`/`transition` below for the actual
// Container Transform implementation (a `times`-keyed keyframe
// window), which replaced a cruder "give opacity a shorter duration"
// version of this same idea.

// AUDIT FIX (responsive/layout audit): on short viewports — landscape
// phones, small foldables, anything shorter than roughly 500-550px
// tall — this panel's content (profile row + search + 6 nav items +
// theme switch + sign-out) can be taller than the available viewport
// height. The OUTER panel below intentionally keeps `overflow:
// 'hidden'` (required for its own backdrop-filter blur to sample
// correctly — see the comment on that element), which means any
// overflow there is silently CLIPPED, not scrollable: on a short
// screen the bottom nav items (including Sign Out) could become
// completely unreachable rather than just visually truncated. Rather
// than touching the outer blur container's overflow behavior, the
// INNER content wrapper gets its own height cap + scroll instead —
// see its own comment further down for why this is the correct place
// for it. `100dvh` (not `100vh`) matches the same dynamic-viewport
// convention used elsewhere in this app (PulseBackground.tsx) to
// avoid the iOS Safari address-bar collapse/expand gap.
const PANEL_MAX_HEIGHT = 'calc(100dvh - 140px)'

// Single transition object shared by BOTH the panel (scale/opacity)
// and the content block (y/opacity) — using the literal same object
// on both `animate` calls is what guarantees they move in lockstep:
// same duration, same easing curve, starting the same frame.
function useSyncedTransition(open: boolean) {
  return open
    ? { duration: OPEN_DURATION, ease: morphEase }
    : { duration: CLOSE_DURATION, ease: morphEase }
}

interface LiquidBloomProps {
  pt: PulseTheme
  open: boolean
  align: Align
}

// ── Liquid fill burst ───────────────────────────────────────────────
// The reference's "dark circle growing from the bottom" moment,
// reinterpreted as a soft glass-tinted bloom. Mounted only while open
// so it costs nothing at rest, and only transform/opacity animate.
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

// NOTE (perf experiment): this used to delegate straight to the
// shared PulseGlassRow (blur + shadow + tint + hover). Kept local and
// self-contained here (not touching PulseGlassRow.tsx, which other
// pages rely on) specifically so this can be reverted by restoring
// the block below to:
//
// function GlassRow({ dark, radius = ROW_RADIUS, style = {}, children, ...rest }: GlassRowProps) {
//   return (
//     <PulseGlassRow
//       dark={dark}
//       radius={radius}
//       className="glass-focus-ring"
//       hoverTint={dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'}
//       style={style}
//       {...rest}
//     >
//       {children}
//     </PulseGlassRow>
//   )
// }
//
// The version below drops each row's own backdrop-filter blur (the
// panel behind them already applies one real blur — see the outer
// motion.div's liquidGlassBackdrop() below). Stacking ~8 additional
// independent blurred layers inside one animating panel is a common
// mobile-Safari jank source; this keeps the shadow/tint/hover glass
// look but blurs once instead of nine times.
function GlassRow({ dark, radius = ROW_RADIUS, style = {}, children, onClick, ...rest }: GlassRowProps) {
  const [hovered, setHovered] = useState(false)
  const interactive = !!onClick
  const hoverTint = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'

  return (
    <div
      {...rest}
      onClick={onClick}
      className="glass-focus-ring"
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: radius, cursor: interactive ? 'pointer' : 'default', ...style }}
    >
      <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: liquidGlassShadow(dark) }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: liquidGlassTint(dark) }} />
      {hovered && (
        <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: hoverTint }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
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
  const [searchValue, setSearchValue] = useState('')
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  // PERF FIX: `willChange` on the panel used to be a static, always-on
  // style — meaning every page that mounts NavMenu (i.e. every page)
  // reserved an off-screen compositing layer for the panel's blur for
  // the entire time the page was open, even if the menu was never
  // touched. `willChange` is meant to be applied only while an
  // animation is imminent/in-flight, not permanently — this tracks
  // that window explicitly via the panel's own onAnimationStart/
  // onAnimationComplete callbacks below, so the hint is only active
  // during the ~0.55-0.6s the scale/opacity are actually moving.
  const [animating, setAnimating] = useState(false)
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
  const transition = useSyncedTransition(open)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEscape(e: KeyboardEvent | globalThis.KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape as EventListener)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape as EventListener)
    }
  }, [open])

  // AUDIT FIX (accessibility — focus management): a standard
  // dropdown/disclosure should move focus INTO itself on open (so a
  // keyboard user doesn't have to blind-Tab past the rest of the page
  // header to reach it) and return focus to the trigger button on
  // close, regardless of which of the three close paths fired
  // (Escape, outside click, or picking an item via goTo/handleSignOut
  // below). A short rAF delay lets the open state's DOM update land
  // before we query for a focusable target — querying synchronously
  // in the same tick this effect runs can occasionally race the
  // browser's own paint/layout pass for newly-tabbable elements.
  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => {
        contentRef.current?.querySelector<HTMLElement>('[role="button"], input, button')?.focus()
      })
      return () => cancelAnimationFrame(raf)
    }
    triggerButtonRef.current?.focus()
  }, [open])

  // AUDIT FIX (accessibility — close on focus loss): previously the
  // only ways to close were Escape, an outside click, or picking an
  // item. A keyboard user who simply Tabs past the last focusable row
  // (Sign Out, or the theme switch if signed out) left the panel
  // visually open — floating over page content — with focus already
  // elsewhere on the page. Standard dropdown behavior closes
  // automatically once focus genuinely leaves the panel.
  // `relatedTarget` is the element about to receive focus; if it's
  // still inside this wrapper (e.g. focus moving from the search
  // input to a nav row), this is a no-op.
  function handleContentBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false)
  }

  function goTo(path: string) { setOpen(false); navigate(path) }

  function submitSearch() {
    const q = searchValue.trim()
    setOpen(false)
    navigate('/search', q ? { state: { initialQuery: q } } : undefined)
    setSearchValue('')
  }

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  const cornerSide: Align = align === 'right' ? 'right' : 'left'

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: BUTTON_SIZE, height: BUTTON_SIZE }}>
      {/* Glass panel — ALWAYS at its true, final layout size. Nothing
          about width/height/border-radius ever animates, which is the
          actual fix: since the box's real dimensions never change,
          the browser computes the backdrop-blur once and the GPU just
          re-composites that cached result under the scale transform,
          instead of re-blurring a resizing region every frame. Only
          `scale` and `opacity` are ever touched here — both are
          compositor-only, so this is genuinely free regardless of
          device. Opacity gets its OWN faster transition on open (see
          OPEN_OPACITY_DURATION) so the blur reads as visible early,
          not lagging behind the scale's slower grow.

          `initial={false}` is required here — without it, Framer
          Motion treats every fresh MOUNT of this component as an
          animation from an implicit "open" starting point down to
          whatever `animate` currently resolves to. Since this panel
          is unconditionally rendered (not `{open && ...}`), and since
          NavMenu itself mounts fresh every time you cross the Home
          boundary (Home renders its own NavMenu instance; every other
          route shares one persistent instance via SiteHeader, which
          unmounts it entirely on '/'), that meant every "into/out of
          Home" navigation — and every page reload — played a bogus
          "menu closing" animation on load, even though nothing was
          ever opened. `initial={false}` makes it render directly into
          its closed (or whatever `open` currently is) state with zero
          animation on mount; real open/close clicks are unaffected,
          since those are state updates, not mounts. */}
      <motion.div
        initial={false}
        style={{
          position: 'absolute', top: 0, [cornerSide]: 0,
          width: PANEL_WIDTH,
          maxWidth: '90vw',
          transformOrigin: cornerSide === 'right' ? 'top right' : 'top left',
          pointerEvents: open ? 'auto' : 'none',
          zIndex: 1999,
          // backdrop-filter added per Google's own guidance for
          // "heaviest use cases — full-screen panels, persistent
          // sidebars": promotes this to its own GPU layer ahead of
          // the animation instead of during it.
          //
          // PERF FIX: dropped 'backdrop-filter' from this hint list.
          // The blur value itself never animates (only scale/opacity
          // do — it's applied once on mount via liquidGlassBackdrop()
          // below and stays constant), so hinting it here just told
          // the browser to keep an extra isolated compositing layer
          // reserved for no benefit. willChange should only list
          // properties that actually change over time.
          //
          // PERF FIX (follow-up): `willChange` itself is now only set
          // while `animating` is true (see the animating state above
          // + onAnimationStart/onAnimationComplete below), instead of
          // being a permanent style. Previously this reserved a GPU
          // compositing layer for the entire time ANY page was open —
          // NavMenu mounts on every route — regardless of whether the
          // menu was ever clicked. 'auto' at rest lets the browser
          // reclaim that layer when the panel isn't moving.
          willChange: animating ? 'transform, opacity' : 'auto',
          // overflow-hidden + isolation:isolate + backdrop-filter all
          // live on THIS element — the same one that carries the
          // scale/opacity animation below. That co-location is what
          // makes backdrop-filter actually work: it needs to sample
          // "behind itself" at its own pre-transform position. Once
          // it's nested a level inside a SEPARATE already-transformed
          // ancestor it gets trapped sampling only within that
          // ancestor's own isolated layer, which has nothing behind
          // it — so it blurs nothing, regardless of the blur radius.
          //
          // This element deliberately does NOT get a maxHeight/scroll
          // of its own (see PANEL_MAX_HEIGHT's comment above) — it has
          // no explicit height, so it naturally shrinks to whatever
          // its (now height-capped, scrollable) inner content needs.
          isolation: 'isolate', overflow: 'hidden', borderRadius: PANEL_RADIUS,
          ...liquidGlassBackdrop(),
        } as CSSProperties}
        // This is Material Design's "Container Transform" pattern —
        // the same one Google names for exactly "a search bar into
        // expanded search." Its actual technique: don't make opacity
        // track the scale for the whole duration. Confine the
        // cross-fade to the MIDDLE third of the transition, on its
        // own linear curve, fully decoupled from the scale's
        // ease-in-out. Scale plays start-to-finish; opacity sits at 0
        // through the first 35%, ramps to 1 (linear) by 65%, then
        // holds. Reversed symmetrically on close. That's what a real
        // container-transform blur/opacity relationship looks like —
        // not "opacity finishes early," but "opacity is confined to a
        // narrow window with a different curve entirely."
        animate={{
          scale: open ? 1 : CLOSED_SCALE,
          opacity: open ? [0, 0, 1, 1] : [1, 1, 0, 0],
        }}
        transition={{
          scale: transition,
          opacity: {
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

        <LiquidBloom pt={pt} open={open} align={cornerSide} />

        {/* Spacer matching the real button's footprint, so the list
            below never sits under it. */}
        <div style={{ height: BUTTON_SIZE }} />

        {/* Content — `y` stays on the same shared `transition` as the
            panel's scale (so the "pull down/up" is locked to identical
            timing, per the earlier request). `opacity` gets the SAME
            Container Transform keyframe window as the panel now: per
            MDN's spec, ANY ancestor with opacity < 1 becomes a
            "backdrop root", meaning every row's own backdrop-filter
            inside it can only see the (empty) space between rows —
            not the real panel/page behind them — until this wrapper's
            opacity is a true 1. That's the actual mechanism behind
            "the buttons' blur is delayed": this opacity used to ride
            the full, slow-to-settle morphEase curve, unlocking every
            row's blur later than the panel's own (already-fixed)
            blur. Windowing it the same way settles both at the same
            point in the timeline.

            `initial={false}` — same reasoning as the outer panel
            above: this is also unconditionally mounted, so without
            this it plays its own bogus "closing" slide/fade on every
            fresh mount of NavMenu, stacking with the panel's own
            mount-flash into the "menu opens and closes" glitch.

            AUDIT FIX: added `maxHeight: PANEL_MAX_HEIGHT` +
            `overflowY: 'auto'` (+ `WebkitOverflowScrolling: 'touch'`
            for momentum scrolling on iOS). Previously this had no
            height constraint at all, so on a short viewport (landscape
            phones, small foldables) its content could exceed the
            screen height and get silently clipped by the OUTER
            panel's required `overflow: hidden` — with no way to
            scroll down to the clipped items (including Sign Out).
            Capping height here and scrolling internally keeps every
            row reachable on any viewport, without touching the outer
            element's overflow (which must stay `hidden` for its own
            backdrop-filter blur to render correctly).

            AUDIT FIX (accessibility): `ref={contentRef}` + `onBlur`
            here back the focus-management effect and close-on-blur
            handler above — see their own comments for why. */}
        <motion.div
          ref={contentRef}
          initial={false}
          animate={{ y: open ? 0 : -16, opacity: open ? [0, 0, 1, 1] : [1, 1, 0, 0] }}
          transition={{
            y: transition,
            opacity: {
              duration: open ? OPEN_DURATION : CLOSE_DURATION,
              times: [0, 0.35, 0.65, 1],
              ease: 'linear',
            },
          }}
          onBlur={handleContentBlur}
          aria-hidden={!open}
          style={{
            position: 'relative', zIndex: 1, width: PANEL_WIDTH, padding: '0 14px 16px',
            fontFamily: pulseFonts.body, display: 'flex', flexDirection: 'column', gap: 10,
            maxHeight: PANEL_MAX_HEIGHT, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          } as CSSProperties}
        >
          {/* Profile / Sign In — AUDIT FIX (per user request): the
              circular avatar badge (background gradient + name's
              first initial) has been removed. Name and points now sit
              flush left in the row instead of next to a badge. */}
          {user ? (
            <GlassRow dark={dark} radius={18} onClick={() => goTo('/profile')}
              role="button" tabIndex={open ? 0 : -1}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo('/profile') } }}
              style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    color: pt.text, fontWeight: 800, fontSize: 14,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>Dr. {profile?.name || '...'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: pt.amber, fontSize: 12, fontWeight: 700, marginTop: 3 }}>
                    ⭐ {profile?.points || 0} points
                  </div>
                </div>
              </div>
            </GlassRow>
          ) : (
            <GlassRow dark={dark} radius={18} onClick={() => goTo('/auth')}
              role="button" tabIndex={open ? 0 : -1} style={{ cursor: 'pointer' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px', color: '#fff', fontWeight: 800, fontSize: 14,
                background: `linear-gradient(135deg, ${pt.cobalt}cc, ${pt.indigo}cc)`
              }}>Sign In →</div>
            </GlassRow>
          )}

          {/* Search bar — same glass recipe as the input on the Search
              page itself (glassInput from PulseUI: pill shape,
              blur(14px), solid border), just sized to fit the panel
              instead of the page's full width. Everything else about
              it — the icon, submit-on-Enter, click-to-submit — is
              unchanged. */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <SearchIcon size={16} color={pt.faint} style={{ position: 'absolute', left: 16, top: '60%', transform: 'translateY(-60%)', pointerEvents: 'none' }} />
            <input
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitSearch() }}
              placeholder="Search..."
              type="search"
              tabIndex={open ? 0 : -1}
              style={{
                ...glassInput(pt, dark),
                padding: '13px 18px 13px 42px',
                marginBottom: 0,
                fontSize: 14,
              }}
            />
          </div>

          {/* Navigation — icon before label, same icon set (and
              accent colors) as Home's own tool cards. Hover is the
              GlassRow pop now, not a letter animation. */}
          {navItems.map(item => {
            const Icon = item.Icon
            const iconColor = pt[item.accent] || pt.text
            return (
              <GlassRow key={item.href} dark={dark} radius={16} onClick={() => goTo(item.href)}
                role="button" tabIndex={open ? 0 : -1}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(item.href) } }}
                style={{ cursor: 'pointer' }}>
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

          {/* Sign out — now opens a confirmation dialog instead of
              signing out immediately on click (see ConfirmDialog
              below), matching the same confirmation the Sign Out
              button on the Profile page uses. */}
          {user && (
            <GlassRow dark={dark} radius={16} onClick={() => setShowSignOutConfirm(true)}
              role="button" tabIndex={open ? 0 : -1}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowSignOutConfirm(true) } }}
              style={{ cursor: 'pointer' }}>
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

      {/* Real toggle button — fixed 44x44, never scaled or distorted.
          Sits above the glass panel (higher zIndex) at the same
          corner, so it stays crisp throughout the whole open/close
          motion regardless of what the panel underneath is doing.

          AUDIT FIX: `ref={triggerButtonRef}` backs the focus-return
          effect above — closing the menu via Escape, an outside
          click, or picking an item now returns keyboard focus here,
          instead of leaving it wherever it happened to land (or
          nowhere, per-browser-default, if the closing click landed on
          a non-focusable element). */}
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
          whileHover={!open ? { scale: 1.06 } : undefined}
          whileTap={{ scale: 0.88 }}
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
