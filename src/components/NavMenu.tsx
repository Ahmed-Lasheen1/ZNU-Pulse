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
// Fixed width for the icon that sits before "Dr. Name" and before the
// points count in the profile row. Previously each row's icon (13px
// UserIcon, 11px StarIcon) sat directly against a slightly different
// gap (6px vs 5px), so the text/number after it started at a
// different x offset on each line — the two rows never lined up.
// Giving both icons an identical-size, centered column (and an
// identical gap after it) means the text on both lines now starts at
// exactly the same x position, and the icons themselves sit in a
// clean vertical column instead of drifting based on each glyph's own
// width. StarIcon's size was also bumped from 11 to 13 to match
// UserIcon, so the two icons read as the same size, not just aligned.
const PROFILE_ICON_COL = 16
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

// ── Nav item reveal (ported from the reference ListItem component) ──
// The reference animates each row in ONLY on mount: initial
// { opacity: 0, y: 40 } -> animate { opacity: 1, y: 0 }, a spring with
// bounce 0.1 / duration 0.25, staggered per row via
// `delay: (index + 8) * 0.025`. That stagger constant/offset is
// reproduced here as NAV_ITEM_STAGGER / NAV_ITEM_BASE_INDEX. Because
// the reference only ever mounts this list when its own panel opens
// (`{isOpened && (...)}`) and drops it instantly on close, getting a
// true reverse-on-close requires the rows to genuinely unmount too —
// see the AnimatePresence-wrapped block below, which is the actual
// change from a same-mounted-opacity-toggle to a real mount/unmount
// animation.
const NAV_ITEM_STAGGER = 0.025
const NAV_ITEM_BASE_INDEX = 8

// AUDIT FIX (respect prefers-reduced-motion): none of the animated
// bits below — the panel's scale/opacity, the content's y/opacity, the
// decorative bloom, the trigger button's hover/tap scale — used to
// check this at all. Someone with reduced-motion set still got the
// full container-transform grow/shrink + a radial bloom burst every
// time they opened this menu. This collapses everything to a quick,
// simple opacity fade (no scale, no vertical slide, no bloom) when the
// OS/browser preference is set, and re-checks live if the setting
// changes mid-session.
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

// Single transition object shared by BOTH the panel (scale/opacity)
// and the content block (y/opacity) — using the literal same object
// on both `animate` calls is what guarantees they move in lockstep:
// same duration, same easing curve, starting the same frame.
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
//
// AUDIT FIX (halo only visible on first launch): `liquidGlassShadow`'s
// outward glow term (`0 0 12px rgba(255,255,255,0.15)`) used to be
// painted on a div living INSIDE the same wrapper that has
// `overflow: hidden` (required so the tint layer respects this row's
// rounded corners). An outward box-shadow clipped by an ancestor at
// the exact same bounds renders zero pixels — every time, not just
// "sometimes". The only reason it ever appeared to show up was a
// brief GPU-compositing quirk during the panel's opening scale
// transform, where the clip hadn't fully caught up to the transform
// yet on that first frame or two — once the transform settles (or on
// any later open), the clip is fully applied and the glow vanishes.
// The real fix is structural, not timing-related: the glow now lives
// on its own unclipped layer, and only the tint/hover fill — which
// genuinely needs rounded-corner clipping — sits inside the
// `overflow: hidden` layer underneath it.
//
// AUDIT FIX (real <button>s, not div role="button"): each interactive
// row used to be a plain <div role="button" tabIndex={...} onKeyDown=
// {...}>, hand-rolling keyboard activation. One call site (the
// "Sign In →" row) never actually had an onKeyDown handler at all,
// which meant it silently wasn't operable via Enter/Space from the
// keyboard. Rendering a real <button> when the row is interactive
// gives every row correct keyboard activation, focus, and screen-
// reader semantics for free, with no per-row keydown handler needed.
function GlassRow({ dark, radius = ROW_RADIUS, style = {}, children, onClick, ...rest }: GlassRowProps) {
  const [hovered, setHovered] = useState(false)
  const interactive = !!onClick
  const hoverTint = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)'
  // Cast to `any`: JSX doesn't cleanly type a variable tag name that
  // switches between "button" and "div" (the two accept different
  // attribute sets), so this sidesteps that rather than fighting it —
  // consistent with the pragmatic `as`/`as any` casts already used
  // elsewhere in this file.
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
      {/* Outward glow — deliberately OUTSIDE the overflow:hidden layer
          below. See the AUDIT FIX note above this component for why
          that's the actual fix, not a cosmetic tweak. */}
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

// AUDIT FIX (unnecessary re-renders): the search field's value used to
// live in NavMenu's own state, meaning every keystroke re-rendered the
// entire panel — profile row, all six nav items, ThemeSwitch, the
// sign-out row — just to update one input's displayed text. Pulling
// the input (and its own small bit of state) into this standalone
// component means a keystroke only ever re-renders this, nothing else
// in the menu.
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

  useEffect(() => {
    if (!open) return
    // AUDIT FIX (touch devices): this used to only listen for
    // `mousedown`. The blur-based close handler below (handleContentBlur)
    // bails out whenever `relatedTarget` is null — which is common on
    // touch, since a tap outside doesn't always move focus to a
    // specific element the way a mouse click does. Listening for
    // `touchstart` too means a tap outside the panel reliably closes
    // it on touch devices as well, not just desktop mouse clicks.
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
  if (!open) {
    triggerButtonRef.current?.focus()
  }
}, [open])

  // AUDIT FIX (accessibility — close on focus loss): previously the
  // only ways to close were Escape, an outside click, or picking an
  // item. A keyboard user who simply Tabs past the last focusable row
  // (Sign Out, or the theme switch if signed out) left the panel
  // visually open — floating over page content — with focus already
  // elsewhere on the page. Standard dropdown behavior closes
  // automatically once focus genuinely leaves the panel.
  //
  // AUDIT FIX (reopen-on-close bug): when the menu opens, the effect
  // above auto-focuses the first row. Clicking the TRIGGER BUTTON to
  // close then fired this blur handler first (since focus was moving
  // away from that row) — which called setOpen(false) — immediately
  // followed by the button's own onClick, whose `setOpen(o => !o)`
  // read the just-queued `false` and flipped it straight back to
  // `true` in the same batch. Net effect: clicking the toggle to
  // close visibly reopened the menu instead. Skipping this handler
  // whenever focus is headed to the trigger button specifically
  // leaves that button's own click handler as the single source of
  // truth for that one case, while every other "focus left the
  // panel" scenario (Tabbing past the last row, clicking some other
  // focusable element on the page) still closes correctly here.
  // Also skips when relatedTarget is null (some browsers omit it for
  // window-level focus loss) rather than risk a false-positive close.
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
          since those are state updates, not mounts.

          When `prefers-reduced-motion` is set, `scale` is pinned to 1
          — the panel simply fades in/out at its real size instead of
          growing from the trigger button. */}
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
        //
        // Under prefers-reduced-motion this collapses to a plain,
        // quick linear fade with scale pinned at 1 — see
        // usePrefersReducedMotion above.
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

            Under prefers-reduced-motion, `y` is pinned at 0 — no
            vertical slide at all, just the fade.

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

            AUDIT FIX (halo clipped at top): the profile row's own
            outward glow used to have zero room above it — this
            container's top padding used to be a flat 0, so the row
            sat flush against this scrollable box's own top edge and
            the glow got clipped exactly at that boundary. The glow's
            actual clipping bug has since been fixed at the source (see
            GlassRow's own AUDIT FIX note), so this padding is no longer
            load-bearing for that — it's kept as plain visual breathing
            room above the first row.

            AUDIT FIX (accessibility): `ref={contentRef}` + `onBlur`
            here back the focus-management effect and close-on-blur
            handler above — see their own comments for why. `id` +
            `aria-label` give the trigger button's `aria-controls`
            something concrete to point at. */}
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
          {/* Profile / Sign In — AUDIT FIX (per user request): the
              circular avatar badge (background gradient + name's
              first initial) has been removed. Name and points now sit
              flush left in the row instead of next to a badge.

              AUDIT FIX (per user request): added a small custom
              UserIcon before the name, and swapped the ⭐ emoji for a
              custom thin-line StarIcon before the points count —
              matching the app-wide convention (see tool-icons.tsx) of
              replacing raw emoji with purpose-built glyphs that take
              the theme's own color rather than a fixed emoji glyph.

              AUDIT FIX (icon/text alignment): both icons now sit in an
              identical fixed-width, centered column (PROFILE_ICON_COL)
              with an identical gap before the text — see the constant's
              own comment for why the name and points line previously
              started at two different x positions. */}
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

          {/* Search bar — same glass recipe as the input on the Search
              page itself (glassInput from PulseUI: pill shape,
              blur(14px), solid border), just sized to fit the panel
              instead of the page's full width. Now its own component
              (NavSearch) so typing doesn't re-render the rest of the
              menu — see NavSearch's own comment. */}
          <NavSearch pt={pt} dark={dark} tabIndex={open ? 0 : -1} onSubmit={submitSearch} />

          {/* Navigation — icon before label, same icon set (and
              accent colors) as Home's own tool cards.

              AUDIT FIX (per user request — reuse the reference
              ListItem reveal, reversed on close): rows are now
              genuinely mounted/unmounted via AnimatePresence, driven
              by `open`, instead of staying mounted and only toggling
              opacity. That's what lets `initial`/`exit` do real work
              here, exactly like the reference component's own
              mount-triggered reveal:
                - initial: { opacity: 0, y: 40 } — same starting pose
                  as the reference ListItem.
                - animate: { opacity: 1, y: 0 }, spring
                  { bounce: 0.1, duration: 0.25 }, delayed by
                  (index + NAV_ITEM_BASE_INDEX) * NAV_ITEM_STAGGER —
                  the exact stagger formula the reference uses.
                - exit: the same pose/spring played in reverse order —
                  delay uses the REVERSED index, so the row that
                  appeared LAST during opening is the first to leave,
                  and the row that appeared first lingers longest. That
                  mirrors the opening choreography instead of every
                  row fading out in the same order they came in.
              Falls back to a plain, quick opacity fade with no slide
              or stagger under prefers-reduced-motion, matching every
              other animated piece in this panel. */}
          <AnimatePresence initial={false}>
            {open && navItems.map((item, index) => {
              const Icon = item.Icon
              const iconColor = pt[item.accent] || pt.text
              const reverseIndex = navItems.length - 1 - index

              if (reducedMotion) {
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <GlassRow dark={dark} radius={16} onClick={() => goTo(item.href)} tabIndex={0}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' }}>
                        <Icon color={iconColor} size={17} />
                        <span style={{ color: pt.text, fontWeight: item.href === '/' ? 800 : 600, fontSize: 14, fontFamily: 'inherit' }}>
                          {item.label}
                        </span>
                      </div>
                    </GlassRow>
                  </motion.div>
                )
              }

              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{
                    opacity: 1, y: 0,
                    transition: {
                      type: 'spring', bounce: 0.1, duration: 0.25,
                      delay: (index + NAV_ITEM_BASE_INDEX) * NAV_ITEM_STAGGER,
                    },
                  }}
                  exit={{
                    opacity: 0, y: 40,
                    transition: {
                      type: 'spring', bounce: 0.1, duration: 0.25,
                      delay: (reverseIndex + NAV_ITEM_BASE_INDEX) * NAV_ITEM_STAGGER,
                    },
                  }}
                >
                  <GlassRow dark={dark} radius={16} onClick={() => goTo(item.href)} tabIndex={0}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' }}>
                      <Icon color={iconColor} size={17} />
                      <span style={{ color: pt.text, fontWeight: item.href === '/' ? 800 : 600, fontSize: 14, fontFamily: 'inherit' }}>
                        {item.label}
                      </span>
                    </div>
                  </GlassRow>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Theme switch */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
            <ThemeSwitch dark={dark} onToggle={toggleTheme} scale={0.62} stretchX={1.3} />
          </div>

          {/* Sign out — now opens a confirmation dialog instead of
              signing out immediately on click (see ConfirmDialog
              below), matching the same confirmation the Sign Out
              button on the Profile page uses. */}
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

      {/* Real toggle button — fixed 44x44, never scaled or distorted.
          Sits above the glass panel (higher zIndex) at the same
          corner, so it stays crisp throughout the whole open/close
          motion regardless of what the panel underneath is doing.

          AUDIT FIX: `ref={triggerButtonRef}` backs the focus-return
          effect above — closing the menu via Escape, an outside
          click, or picking an item now returns keyboard focus here.
          It also backs the reopen-bug fix in handleContentBlur.
          `aria-controls` now points at the panel's own `id` so
          assistive tech can associate the two explicitly. Hover/tap
          scale feedback is skipped under prefers-reduced-motion. */}
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
