import { useState, useRef, useEffect, type CSSProperties, type FocusEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import { useAuth } from '@/core/contexts'
import { MenuToggleIcon } from '@/shared/ui/controls/menu-toggle-icon'
import ThemeSwitch from '@/shared/ui/controls/theme-switch'
import { HomeIcon, ScheduleIcon, ChecklistIcon, AnonQAIcon, LeaderboardIcon, BookIcon, SignOutIcon, UserIcon, StarIcon } from '@/shared/icons/tool-icons'
import { getPulseTheme, pulseFonts } from '@/shared/theme/premiumTheme'
import { glassInput } from '@/shared/ui/glass/PulseUI'
import { liquidGlassShadow, glassHoverTint } from '@/shared/theme/liquidGlass'
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
// Room around the pills so their glow is not clipped by the scrolling panel.
const PANEL_PAD = 12
const PANEL_GAP = 8
const PANEL_MAX_HEIGHT = 'calc(100dvh - 140px)'
const SEARCH_WIDTH = 'min(250px, calc(100vw - 48px))'

// Pill transition timings (ms). Opening staggers slowly, closing is quicker.
const OPEN_MS = 260
const OPEN_STAGGER_MS = 30
const CLOSE_MS = 170
const CLOSE_STAGGER_MS = 12

// Pills are almost opaque instead of blurred: backdrop-filter on ~10 pills is what makes phones lag.
function pillTint(dark: boolean) {
  return dark ? 'rgba(38, 48, 68, 0.88)' : 'rgba(255, 255, 255, 0.88)'
}

// Sets the position of a pill in the stagger sequence.
function slot(index: number): CSSProperties {
  return { ['--i' as string]: index } as CSSProperties
}

// Base look shared by every pill row.
function pillStyle(pt: PulseTheme): CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 10, minHeight: BUTTON_SIZE,
    padding: '10px 18px', borderRadius: 999, border: 'none', margin: 0,
    backgroundColor: 'var(--nav-pill-bg)', boxShadow: 'var(--nav-pill-shadow)',
    color: pt.text, fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
    whiteSpace: 'nowrap', textAlign: 'left', maxWidth: '100%', boxSizing: 'border-box',
  }
}

interface NavSearchProps {
  pt: PulseTheme
  dark: boolean
  tabIndex: number
  onSubmit: (query: string) => void
}

// Search field shown as the second pill; Enter opens the Search page.
function NavSearch({ pt, dark, tabIndex, onSubmit }: NavSearchProps) {
  const [value, setValue] = useState('')

  // Sends the query to the parent and clears the field.
  function submit() {
    onSubmit(value)
    setValue('')
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: SEARCH_WIDTH }}>
      <SearchIcon size={16} color={pt.faint} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder="Search..."
        type="search"
        aria-label="Search"
        tabIndex={tabIndex}
        style={{
          ...glassInput(pt, dark),
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          background: 'transparent',
          padding: '12px 18px 12px 42px',
          marginBottom: 0,
          fontSize: 16,
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

// Header menu: a toggle button and a column of pills that slide out under it.
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

  // Pill positions in the stagger: profile, search, nav links, theme, then sign out.
  const searchSlot = 1
  const firstNavSlot = 2
  const themeSlot = firstNavSlot + navItems.length
  const signOutSlot = themeSlot + 1
  const pillCount = user ? signOutSlot + 1 : themeSlot + 1

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

  const panelStyle: CSSProperties = {
    position: 'absolute',
    top: BUTTON_SIZE - PANEL_PAD + PANEL_GAP,
    [cornerSide]: -PANEL_PAD,
    display: 'flex', flexDirection: 'column', gap: 10,
    alignItems: cornerSide === 'right' ? 'flex-end' : 'flex-start',
    padding: PANEL_PAD,
    maxWidth: 'calc(100vw - 8px)',
    maxHeight: PANEL_MAX_HEIGHT,
    overflowY: 'auto', overflowX: 'hidden',
    overscrollBehavior: 'contain',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
    boxSizing: 'border-box',
    zIndex: 1999,
    fontFamily: pulseFonts.body,
    pointerEvents: open ? 'auto' : 'none',
    ['--count' as string]: pillCount,
    ['--nav-side' as string]: cornerSide,
    ['--nav-pill-bg' as string]: pillTint(dark),
    ['--nav-pill-shadow' as string]: liquidGlassShadow(dark),
    ['--nav-pill-hover' as string]: glassHoverTint(dark),
  } as CSSProperties

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: BUTTON_SIZE, height: BUTTON_SIZE }}>
      <style>{`
        .nav-panel::-webkit-scrollbar { display: none; }
        .nav-pill {
          --close-delay: calc((var(--count) - var(--i)) * ${CLOSE_STAGGER_MS}ms);
          flex-shrink: 0;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-14px) scale(0.9);
          transform-origin: top var(--nav-side);
          transition:
            transform ${CLOSE_MS}ms ease-in var(--close-delay),
            opacity ${CLOSE_MS}ms ease-in var(--close-delay),
            visibility 0s linear calc(${CLOSE_MS}ms + var(--close-delay));
        }
        .nav-panel[data-open="true"] .nav-pill {
          --open-delay: calc(var(--i) * ${OPEN_STAGGER_MS}ms);
          opacity: 1;
          visibility: visible;
          transform: none;
          transition:
            transform ${OPEN_MS}ms cubic-bezier(0.22, 1, 0.36, 1) var(--open-delay),
            opacity ${OPEN_MS - 60}ms ease-out var(--open-delay),
            visibility 0s linear 0s;
        }
        @media (hover: hover) {
          button.nav-pill-btn:hover {
            background-image: linear-gradient(var(--nav-pill-hover), var(--nav-pill-hover));
          }
        }
        button.nav-pill-btn:active { background-image: linear-gradient(var(--nav-pill-hover), var(--nav-pill-hover)); }
        @media (prefers-reduced-motion: reduce) {
          .nav-pill, .nav-panel[data-open="true"] .nav-pill {
            transition-duration: 0.01ms !important;
            transition-delay: 0s !important;
            transform: none;
          }
        }
      `}</style>

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
        {user ? (
          <button
            type="button" className="nav-pill nav-pill-btn glass-focus-ring" tabIndex={tabIndex}
            onClick={() => goTo('/profile')}
            style={{ ...pillStyle(pt), ...slot(0), flexDirection: 'column', alignItems: 'flex-start', gap: 3, borderRadius: 28, cursor: 'pointer' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, maxWidth: '100%' }}>
              <UserIcon color={pt.text} size={13} />
              <span style={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Dr. {profile?.name || '...'}
              </span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: pt.amber, fontSize: 12, fontWeight: 700 }}>
              <StarIcon color={pt.amber} size={13} />
              {profile?.points || 0} points
            </span>
          </button>
        ) : (
          <button
            type="button" className="nav-pill glass-focus-ring" tabIndex={tabIndex}
            onClick={() => goTo('/auth')}
            style={{
              ...pillStyle(pt), ...slot(0), justifyContent: 'center', cursor: 'pointer',
              backgroundImage: `linear-gradient(135deg, ${pt.cobalt}cc, ${pt.indigo}cc)`,
              color: '#fff', fontWeight: 800,
            }}
          >Sign In →</button>
        )}

        <div className="nav-pill" style={{ ...slot(searchSlot), padding: 0, borderRadius: 999, backgroundColor: 'var(--nav-pill-bg)', boxShadow: 'var(--nav-pill-shadow)', maxWidth: '100%' }}>
          <NavSearch pt={pt} dark={dark} tabIndex={tabIndex} onSubmit={submitSearch} />
        </div>

        {navItems.map((item, i) => {
          const Icon = item.Icon
          const iconColor = pt[item.accent] || pt.text
          return (
            <button
              key={item.href} type="button" className="nav-pill nav-pill-btn glass-focus-ring" tabIndex={tabIndex}
              onClick={() => goTo(item.href)}
              style={{ ...pillStyle(pt), ...slot(firstNavSlot + i), cursor: 'pointer', fontWeight: item.href === '/' ? 800 : 600 }}
            >
              <Icon color={iconColor} size={17} />
              {item.label}
            </button>
          )
        })}

        <div className="nav-pill" style={{ ...pillStyle(pt), ...slot(themeSlot), gap: 12, padding: '6px 16px 6px 18px' }}>
          <span>Theme</span>
          <ThemeSwitch dark={dark} onToggle={toggleTheme} scale={0.62} stretchX={1.3} />
        </div>

        {user && (
          <button
            type="button" className="nav-pill nav-pill-btn glass-focus-ring" tabIndex={tabIndex}
            onClick={() => setShowSignOutConfirm(true)}
            style={{ ...pillStyle(pt), ...slot(signOutSlot), cursor: 'pointer', color: pt.danger, fontWeight: 700 }}
          >
            <SignOutIcon color={pt.danger} size={17} />
            Sign Out
          </button>
        )}
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
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            outline: 'none'
          }}
        >
          <MenuToggleIcon open={open} width={44} height={44} stroke="#010c4a" duration={400} />
        </button>
      </div>
    </div>
  )
}
