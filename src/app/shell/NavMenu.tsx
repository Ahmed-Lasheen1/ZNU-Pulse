import { useState, useRef, useEffect, type CSSProperties, type FocusEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import { useAuth } from '@/core/contexts'
import { MenuToggleIcon } from '@/shared/ui/controls/menu-toggle-icon'
import ThemeSwitch from '@/shared/ui/controls/theme-switch'
import { HomeIcon, ScheduleIcon, ChecklistIcon, AnonQAIcon, LeaderboardIcon, BookIcon, SignOutIcon, UserIcon, StarIcon } from '@/shared/icons/tool-icons'
import { getPulseTheme, pulseFonts, ON_BACKGROUND } from '@/shared/theme/premiumTheme'
import { liquidGlassShadow, liquidGlassBackdrop, liquidGlassTint, glassHoverTint } from '@/shared/theme/liquidGlass'
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog'
import type { PulseTheme } from '@/shared/theme/types'

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

const navItems: NavItem[] = [
  { label: 'Home', href: '/', Icon: HomeIcon, accent: 'cobalt' },
  { label: 'Schedules', href: '/schedule', Icon: ScheduleIcon, accent: 'indigo' },
  { label: 'Checklist', href: '/checklist', Icon: ChecklistIcon, accent: 'amber' },
  { label: 'Pulse Check', href: '/pulse-check', Icon: AnonQAIcon, accent: 'indigo' },
  { label: 'Leaderboard', href: '/profile?tab=leaderboard', Icon: LeaderboardIcon, accent: 'amber' },
  { label: 'Review', href: '/review', Icon: BookIcon, accent: 'indigo' },
]

const BUTTON_SIZE = 44

// Every pill has exactly this size so the column is symmetric.
const PILL_H = 44
const PILL_GAP = 8
const PILL_W = 'min(220px, calc(100vw - 48px))'

// Space between the toggle button and the first pill, and glow room around the pills.
const PANEL_OFFSET = 8
const PANEL_PAD = 12

// Extra visible room the clip wrapper leaves around the panel: sides for the glow, bottom for the spring overshoot.
const CLIP_BLEED_X = 8
const CLIP_BLEED_BOTTOM = 64

// How far apart the pills end up, and where the first one starts: just above the clip line under the toggle button.
const PILL_STEP = PILL_H + PILL_GAP
const PILL_START = -(PILL_STEP + PILL_H)

// Animation timings (ms). Pills spring out from under the button in turn and slide back in on close.
const OPEN_MS = 650
const OPEN_STAGGER_MS = 35
const CLOSE_MS = 240
const CLOSE_STAGGER_MS = 20
const CLOSE_EASE = 'cubic-bezier(0.4, 0, 0.6, 1)'

// A pill (after the first) fades in only once it has slid out from behind the pill above it.
const FADE_DELAY_MS = 70
const FADE_MS = 140

// Smooth ease-out used where a spring is not supported or would overshoot a scrolling panel.
const SMOOTH_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

// Damped spring (about 5% overshoot) written as a CSS linear() easing, generated from the spring equation.
const SPRING_EASE =
  'linear(0, 0.039, 0.136, 0.263, 0.402, 0.538, 0.663, 0.77, 0.859, 0.928, 0.979, 1.015, 1.037, 1.05, 1.054, 1.053, 1.049, 1.042, 1.035, 1.027, 1.02, 1.014, 1.009, 1.005, 1.002, 1, 0.998, 0.997, 0.997, 0.997, 0.997, 0.998, 0.998, 0.998, 0.999, 0.999, 0.999, 1, 1, 1, 1)'

// Tint of the Sign In pill: replaces the neutral glass tint, like PulseGlassRow's activeTint.
function signInTint(pt: PulseTheme) {
  return `linear-gradient(135deg, ${pt.cobalt}cc, ${pt.indigo}cc)`
}

// Base look shared by every glass pill: same width, same height, content aligned to the left.
// The glass itself (blur, shadow, tint) comes from the .nav-glass class below.
function pillStyle(pt: PulseTheme): CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10,
    width: PILL_W, height: PILL_H, padding: '0 18px', margin: 0,
    border: 'none', borderRadius: 999, boxSizing: 'border-box',
    backgroundColor: 'transparent',
    color: pt.text, fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
    whiteSpace: 'nowrap', textAlign: 'left',
  }
}

// Sets the position of a node in the chain (used for the stagger delays).
function slot(index: number): CSSProperties {
  return { ['--i' as string]: index } as CSSProperties
}

// Nests every pill inside the previous pill's node so each pill moves with the pill above it and only slides one step on its own.
function renderChain(pills: ReactNode[], index = 0): ReactNode {
  if (index >= pills.length) return null
  return (
    <div className={index === 0 ? 'nav-node' : 'nav-node nav-node-child'} style={slot(index)}>
      {pills[index]}
      {renderChain(pills, index + 1)}
    </div>
  )
}

interface NavSearchProps {
  pt: PulseTheme
  tabIndex: number
  onSubmit: (query: string) => void
}

// Search field that fills its pill: icon on the left, text starting right after it.
function NavSearch({ pt, tabIndex, onSubmit }: NavSearchProps) {
  const [value, setValue] = useState('')

  // Sends the query to the parent and clears the field.
  function submit() {
    onSubmit(value)
    setValue('')
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SearchIcon size={16} color={pt.faint} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      <input
        className="nav-search-input"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder="Search..."
        type="search"
        aria-label="Search"
        tabIndex={tabIndex}
        style={{ color: pt.text }}
      />
    </div>
  )
}

interface NavMenuProps {
  dark: boolean
  toggleTheme: () => void
  align?: Align
}

// Header menu: a toggle button and a chain of equal pills that unfold from under it, each from behind the pill above.
export default function NavMenu({ dark, toggleTheme, align = 'left' }: NavMenuProps) {
  const [open, setOpen] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth() as {
    user: AuthUser | null
    profile: AuthProfile | null
    signOut: () => Promise<void>
  }
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerButtonRef = useRef<HTMLButtonElement>(null)
  const hasOpenedRef = useRef(false)
  const skipFocusRestoreRef = useRef(false)
  const pt = getPulseTheme(dark)

  const cornerSide: Align = align === 'right' ? 'right' : 'left'
  const tabIndex = open ? 0 : -1

  // Closes the menu on outside click/tap or Escape while it is open.
  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent | TouchEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEscape(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('touchstart', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('touchstart', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  // Returns focus to the toggle button after the menu closes, unless we are navigating away.
  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true
      return
    }
    if (skipFocusRestoreRef.current) {
      skipFocusRestoreRef.current = false
      return
    }
    if (hasOpenedRef.current) {
      triggerButtonRef.current?.focus()
    }
  }, [open])

  // Closes the menu when keyboard focus moves out of it.
  function handleContentBlur(e: FocusEvent<HTMLDivElement>) {
    const next = e.relatedTarget as Node | null
    if (!next) return
    if (next === triggerButtonRef.current) return
    if (!e.currentTarget.contains(next)) setOpen(false)
  }

  // Closes the menu and navigates without stealing focus back to the toggle.
  function leaveMenu(path: string, state?: object) {
    skipFocusRestoreRef.current = true
    const active = document.activeElement as HTMLElement | null
    if (active && wrapperRef.current?.contains(active)) active.blur()
    setOpen(false)
    navigate(path, state ? { state } : undefined)
  }

  // Opens a page from a menu pill.
  function goTo(path: string) { leaveMenu(path) }

  // Opens the Search page, passing along the typed query.
  function submitSearch(query: string) {
    const q = query.trim()
    leaveMenu('/search', q ? { initialQuery: q } : undefined)
  }

  // Signs the user out and returns to Home.
  async function handleSignOut() {
    skipFocusRestoreRef.current = true
    setOpen(false)
    await signOut()
    navigate('/')
  }

  // Pills in display order: profile (or sign in), search, nav links, theme, then sign out.
  const pills: ReactNode[] = [
    user ? (
      <button
        type="button" className="nav-pill nav-glass nav-pill-btn glass-focus-ring" tabIndex={tabIndex}
        onClick={() => goTo('/profile')}
        style={{ ...pillStyle(pt), flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2, cursor: 'pointer', lineHeight: 1.15 }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, maxWidth: '100%' }}>
          <UserIcon color={pt.text} size={13} />
          <span style={{ fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Dr. {profile?.name || '...'}
          </span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: pt.amber, fontSize: 12, fontWeight: 700 }}>
          <StarIcon color={pt.amber} size={12} />
          {profile?.points || 0} points
        </span>
      </button>
    ) : (
      <button
        type="button" className="nav-pill nav-glass nav-pill-btn glass-focus-ring" tabIndex={tabIndex}
        onClick={() => goTo('/auth')}
        style={{
          ...pillStyle(pt), cursor: 'pointer',
          ['--nav-pill-tint' as string]: signInTint(pt),
          color: '#fff', fontWeight: 800,
        } as CSSProperties}
      >Sign In →</button>
    ),

    <div className="nav-pill nav-glass" style={{ ...pillStyle(pt), padding: 0 }}>
      <NavSearch pt={pt} tabIndex={tabIndex} onSubmit={submitSearch} />
    </div>,

    ...navItems.map(item => {
      const Icon = item.Icon
      const iconColor = pt[item.accent] || pt.text
      return (
        <button
          key={item.href} type="button" className="nav-pill nav-glass nav-pill-btn glass-focus-ring" tabIndex={tabIndex}
          onClick={() => goTo(item.href)}
          style={{ ...pillStyle(pt), cursor: 'pointer', fontWeight: item.href === '/' ? 800 : 600 }}
        >
          <Icon color={iconColor} size={17} />
          {item.label}
        </button>
      )
    }),

    // Theme: only the switch, centred, with no glass pill behind it.
    <div
      className="nav-pill"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: PILL_W, height: PILL_H }}
    >
      <ThemeSwitch dark={dark} onToggle={toggleTheme} scale={0.62} stretchX={1.3} />
    </div>,

    ...(user ? [(
      <button
        key="sign-out" type="button" className="nav-pill nav-glass nav-pill-btn glass-focus-ring" tabIndex={tabIndex}
        onClick={() => setShowSignOutConfirm(true)}
        style={{ ...pillStyle(pt), justifyContent: 'center', cursor: 'pointer', color: pt.danger, fontWeight: 700 }}
      >
        <SignOutIcon color={pt.danger} size={17} />
        Sign Out
      </button>
    )] : []),
  ]

  // Clips the pills at the line under the toggle button; ignores pointer events so its bleed area never blocks the page.
  const clipStyle: CSSProperties = {
    position: 'absolute',
    top: BUTTON_SIZE,
    [cornerSide]: -(PANEL_PAD + CLIP_BLEED_X),
    padding: `0 ${CLIP_BLEED_X}px ${CLIP_BLEED_BOTTOM}px`,
    maxWidth: '100vw',
    boxSizing: 'border-box',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 1999,
  } as CSSProperties

  const panelStyle: CSSProperties = {
    position: 'relative',
    display: 'flex', flexDirection: 'column',
    alignItems: cornerSide === 'right' ? 'flex-end' : 'flex-start',
    padding: `${PANEL_OFFSET}px ${PANEL_PAD}px ${PANEL_PAD}px`,
    maxWidth: '100%',
    boxSizing: 'border-box',
    fontFamily: pulseFonts.body,
    pointerEvents: open ? 'auto' : 'none',
    ['--count' as string]: pills.length,
    ['--start' as string]: `${PILL_START}px`,
    ['--step' as string]: `${PILL_STEP}px`,
    ['--nav-align' as string]: cornerSide === 'right' ? 'flex-end' : 'flex-start',
    // Same glass recipe as LiquidGlassCard / PulseGlassRow (see theme/liquidGlass.js).
    ['--nav-pill-backdrop' as string]: liquidGlassBackdrop().backdropFilter || 'none',
    ['--nav-pill-tint' as string]: liquidGlassTint(dark),
    ['--nav-pill-shadow' as string]: liquidGlassShadow(dark),
    ['--nav-pill-hover' as string]: glassHoverTint(dark),
    ['--nav-placeholder' as string]: pt.faint,
  } as CSSProperties

  return (
    // Pointer events inside the menu must not reach the background grid's window listeners, which redraw the full-screen canvas.
    <div
      ref={wrapperRef}
      onPointerDown={e => e.stopPropagation()}
      onPointerMove={e => e.stopPropagation()}
      style={{ position: 'relative', width: BUTTON_SIZE, height: BUTTON_SIZE }}
    >
      <style>{`
        /* The clip wrapper's top edge sits under the toggle button: pills slide out from it and back behind it.
           The bottom bleed leaves room for the spring overshoot of the last pills. */
        .nav-panel {
          --open-ease: ${SMOOTH_EASE};
          scrollbar-width: none;
          overscroll-behavior: contain;
        }
        .nav-panel::-webkit-scrollbar { display: none; }

        /* Browsers that support linear() get the spring. */
        @supports (transition-timing-function: linear(0, 1)) {
          .nav-panel { --open-ease: ${SPRING_EASE}; }
        }

        /* Only short screens scroll; there the spring is replaced by the smooth ease so the panel does not bounce its scroll area. */
        @media (max-height: 720px) {
          .nav-panel {
            --open-ease: ${SMOOTH_EASE};
            overflow-y: auto; overflow-x: hidden;
            max-height: calc(100dvh - 110px - env(safe-area-inset-top, 0px));
            -webkit-overflow-scrolling: touch;
          }
        }

        /* Every pill lives in a node nested inside the previous pill's node, so it travels with the pill above it.
           Closed, each child node is pulled up one step, which puts its pill directly behind the pill above it.
           Only transform changes, on translate3d layers. */
        .nav-node {
          --open-delay: calc(var(--i) * ${OPEN_STAGGER_MS}ms);
          --close-delay: calc((var(--count) - 1 - var(--i)) * ${CLOSE_STAGGER_MS}ms);
          --closed-y: var(--start);
          display: flex; flex-direction: column; align-items: var(--nav-align); gap: ${PILL_GAP}px;
          flex-shrink: 0;
          isolation: isolate;
          will-change: transform;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translate3d(0, var(--closed-y), 0);
          transition: transform ${CLOSE_MS}ms ${CLOSE_EASE} var(--close-delay);
        }

        /* Child nodes paint behind the pill above them, so a pill is hidden until it slides out from under it. */
        .nav-node-child {
          --closed-y: calc(var(--step) * -1);
          z-index: -1;
        }

        /* Open: each node springs to its place in turn, first node first. */
        .nav-panel[data-open="true"] .nav-node {
          transform: translate3d(0, 0, 0);
          transition: transform ${OPEN_MS}ms var(--open-ease) var(--open-delay);
        }

        /* Closed pills are invisible (the panel is also inert and aria-hidden); the switch happens after the pill has folded away. */
        .nav-pill {
          opacity: 0;
          transition: opacity 0s linear calc(${CLOSE_MS}ms + var(--close-delay));
        }
        .nav-panel[data-open="true"] .nav-pill {
          opacity: 1;
          transition: opacity 0s linear var(--open-delay);
        }

        /* Pills after the first fade in once they have separated from the pill above. */
        .nav-panel[data-open="true"] .nav-node-child > .nav-pill {
          transition: opacity ${FADE_MS}ms linear calc(var(--open-delay) + ${FADE_DELAY_MS}ms);
        }

        /* Glass pill, same three layers as PulseGlassRow: blur on the pill, then shadow, then tint, all under the content.
           overflow hidden clips the outer glow exactly like the cards do. */
        .nav-glass {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          -webkit-backdrop-filter: var(--nav-pill-backdrop);
          backdrop-filter: var(--nav-pill-backdrop);
        }
        .nav-glass::before,
        .nav-glass::after {
          content: '';
          position: absolute; inset: 0; z-index: -1;
          border-radius: inherit;
          pointer-events: none;
        }
        .nav-glass::before { box-shadow: var(--nav-pill-shadow); }
        .nav-glass::after { background: var(--nav-pill-tint); }

        @media (hover: hover) {
          button.nav-pill-btn:hover::after {
            background: linear-gradient(var(--nav-pill-hover), var(--nav-pill-hover)), var(--nav-pill-tint);
          }
        }
        button.nav-pill-btn:active::after {
          background: linear-gradient(var(--nav-pill-hover), var(--nav-pill-hover)), var(--nav-pill-tint);
        }

        .nav-search-input {
          display: block; width: 100%; height: 100%; margin: 0;
          padding: 0 18px 0 44px; border: none; border-radius: 999px; outline: none;
          background: transparent; font-family: inherit; font-size: 16px; font-weight: 600;
          line-height: normal; text-align: left;
          -webkit-appearance: none; appearance: none;
        }
        .nav-search-input::placeholder { color: var(--nav-placeholder); opacity: 1; }
        .nav-search-input::-webkit-search-decoration,
        .nav-search-input::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; display: none; }
        .nav-search-input:focus-visible { box-shadow: 0 0 0 2px #38bdf8; }

        @media (prefers-reduced-motion: reduce) {
          .nav-node, .nav-panel[data-open="true"] .nav-node,
          .nav-pill, .nav-panel[data-open="true"] .nav-pill,
          .nav-panel[data-open="true"] .nav-node-child > .nav-pill {
            transition-duration: 0.01ms !important;
            transition-delay: 0s !important;
          }
        }
      `}</style>

      <div className="nav-clip" style={clipStyle}>
        <div
          id="nav-menu-panel"
          className="nav-panel"
          data-open={open}
          aria-label="Site navigation"
          aria-hidden={!open}
          {...(!open ? { inert: '' as any } : {})}
          onBlur={handleContentBlur}
          style={panelStyle}
        >
          {renderChain(pills)}
        </div>
      </div>

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

      <div style={{
        position: 'absolute', top: 0, [cornerSide]: 0,
        width: BUTTON_SIZE, height: BUTTON_SIZE, zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <button
          ref={triggerButtonRef}
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls="nav-menu-panel"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44, flexShrink: 0, padding: 0,
            background: 'transparent',
            border: 'none',
            // The menu icon strokes with currentColor, so it follows the page text color in both modes.
            color: ON_BACKGROUND.primary,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            outline: 'none'
          }}
        >
          <MenuToggleIcon open={open} width={44} height={44} duration={400} />
        </button>
      </div>
    </div>
  )
}
