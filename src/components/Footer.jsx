import { useNavigate } from 'react-router-dom'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_BOTTOM } from '../premiumTheme'
import PulseGlassRow from './pulse/PulseGlassRow'
import {
  HomeIcon, ScheduleIcon, ChecklistIcon, AnonQAIcon, LeaderboardIcon, SearchIcon2,
} from './ui/tool-icons'
import { ExamIcon, NotesIcon } from '../lib/medicalIcons'

const LOGO_SRC = '/icon-192.png'

// Same reasoning as Home.tsx's FOOTER_LINE_COLOR: the footer always
// sits on the dark/lower portion of the fixed PULSE_BG gradient,
// regardless of the app's light/dark theme toggle (the gradient
// itself never changes with that toggle) — so every border/divider
// here is frozen to the dark-mode value rather than reading a
// Liquid Glass token that would otherwise flip with the theme.
const DIVIDER_COLOR = getPulseTheme(true).border
const HOVER_TINT = 'rgba(255,255,255,0.08)'

// Column link groups — grouped by what a visitor is actually looking
// for (explore the app / connect with the community / manage your
// account), the same "answers one of a few questions" grouping
// footer-design guides converge on, rather than one long flat list.
const EXPLORE_LINKS = [
  { label: 'Home', to: '/', Icon: HomeIcon },
  { label: 'Schedules', to: '/schedule', Icon: ScheduleIcon },
  { label: 'Checklist', to: '/checklist', Icon: ChecklistIcon },
  { label: 'MCQ Bank', to: '/mcq', Icon: ExamIcon },
  { label: 'Smart Summaries', to: '/summaries', Icon: NotesIcon },
]

const COMMUNITY_LINKS = [
  { label: 'Anonymous Q&A', to: '/anon-questions', Icon: AnonQAIcon },
  { label: 'Leaderboard', to: '/profile?tab=leaderboard', Icon: LeaderboardIcon },
  { label: 'Search', to: '/search', Icon: SearchIcon2 },
]

const ACCOUNT_LINKS = [
  { label: 'My Profile', to: '/profile' },
  { label: 'Sign In', to: '/auth' },
  { label: 'Exam History & Mistakes', to: '/review' },
]

function FooterHeading({ children }) {
  return (
    <h3 style={{
      ...pulseType.sectionLabel,
      color: ON_GRADIENT_BOTTOM.muted,
      marginBottom: 16,
    }}>{children}</h3>
  )
}

function FooterLink({ label, to, Icon, onNavigate }) {
  return (
    <PulseGlassRow dark={true} radius={10} hoverTint={HOVER_TINT} onClick={() => onNavigate(to)}
      role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(to) } }}
      style={{ marginBottom: 4 }}>
      <div style={{
        padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8,
        color: ON_GRADIENT_BOTTOM.secondary, fontSize: 13, fontWeight: 600,
        fontFamily: pulseFonts.body,
      }}>
        {Icon && <Icon color={ON_GRADIENT_BOTTOM.muted} size={14} />}
        {label}
      </div>
    </PulseGlassRow>
  )
}

// Two soft, low-opacity glows scoped to the footer only (NOT the
// full-viewport GradientBlobs used on Auth/ResetPassword, which is
// `position: fixed` and meant to cover an entire page). These are
// `position: absolute` against the footer's own `position: relative`
// container, sized and placed to bleed off its edges — the same
// "carry the brand's visual identity into the footer" idea the
// footer-design research calls out, applied at a scale that suits a
// site-wide footer rather than a hero section.
function FooterGlow({ pt }) {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', width: 420, height: 420, borderRadius: '50%',
        background: `radial-gradient(circle, ${pt.cobalt}22, transparent 70%)`,
        top: -220, left: '-8%', filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute', width: 360, height: 360, borderRadius: '50%',
        background: `radial-gradient(circle, ${pt.indigo}1c, transparent 70%)`,
        bottom: -200, right: '-6%', filter: 'blur(70px)',
      }} />
    </div>
  )
}

export default function Footer({ dark }) {
  const navigate = useNavigate()
  const pt = getPulseTheme(dark)
  const year = new Date().getFullYear()

  function goTo(path) {
    navigate(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function backToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer style={{
      position: 'relative',
      zIndex: 1,
      overflow: 'hidden',
      borderTop: `1px solid ${DIVIDER_COLOR}`,
      fontFamily: pulseFonts.body,
    }}>
      <style>{`
        .site-footer-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr 1fr;
          gap: 32px;
        }
        @media (max-width: 900px) {
          .site-footer-grid { grid-template-columns: 1fr 1fr; gap: 28px 20px; }
        }
        @media (max-width: 560px) {
          .site-footer-grid { grid-template-columns: 1fr; gap: 28px; }
        }
        .site-footer-bottom {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-wrap: wrap;
        }
        @media (max-width: 560px) {
          .site-footer-bottom { flex-direction: column; text-align: center; }
        }
        .site-footer-wordmark {
          font-size: clamp(40px, 11vw, 128px);
        }
      `}</style>

      <FooterGlow pt={pt} />

      <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '56px 20px 0' }}>
        <div className="site-footer-grid" style={{ marginBottom: 40 }}>
          {/* Brand column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40, flexShrink: 0, borderRadius: 10, overflow: 'hidden',
                background: pt.surfaceFlat, border: `1px solid ${pt.cobaltBorder}`,
              }}>
                <img src={LOGO_SRC} alt="ZNU Pulse" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div style={{
                ...pulseType.sectionTitle,
                fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 18, letterSpacing: 1,
                color: ON_GRADIENT_BOTTOM.primary, lineHeight: 1,
              }}>
                ZNU <span style={{ color: pt.cobalt }}>PULSE</span>
              </div>
            </div>
            <p style={{
              color: ON_GRADIENT_BOTTOM.secondary, fontSize: 13, lineHeight: 1.6, maxWidth: 320, marginBottom: 6,
            }}>
              Your integrated medical study platform — schedules, checklists, an MCQ bank, and smart summaries, all in one place.
            </p>
            <p style={{ color: ON_GRADIENT_BOTTOM.muted, fontSize: 12, lineHeight: 1.6 }}>
              Faculty of Medicine — Zagazig National University
            </p>
          </div>

          {/* Explore column */}
          <div>
            <FooterHeading>Explore</FooterHeading>
            {EXPLORE_LINKS.map(l => <FooterLink key={l.to} {...l} onNavigate={goTo} />)}
          </div>

          {/* Community column */}
          <div>
            <FooterHeading>Community</FooterHeading>
            {COMMUNITY_LINKS.map(l => <FooterLink key={l.to} {...l} onNavigate={goTo} />)}
          </div>

          {/* Account column */}
          <div>
            <FooterHeading>Account</FooterHeading>
            {ACCOUNT_LINKS.map(l => <FooterLink key={l.to} {...l} onNavigate={goTo} />)}
          </div>
        </div>

        <div style={{ height: 1, background: DIVIDER_COLOR, marginBottom: 20 }} />

        {/* Legal / credit strip */}
        <div className="site-footer-bottom" style={{ paddingBottom: 24 }}>
          <div style={{ color: ON_GRADIENT_BOTTOM.muted, fontSize: 12, fontWeight: 600 }}>
            © {year} ZNU Pulse. All rights reserved.
          </div>
          <div style={{ color: ON_GRADIENT_BOTTOM.muted, fontSize: 12, fontWeight: 600 }}>
            Made with ❤️ by Ahmed Lasheen · ZNU Future Doctors
          </div>
          <PulseGlassRow dark={true} radius={999} hoverTint={HOVER_TINT} onClick={backToTop}
            role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); backToTop() } }}>
            <div style={{
              padding: '7px 16px', fontSize: 12, fontWeight: 700,
              color: ON_GRADIENT_BOTTOM.secondary,
            }}>↑ Back to top</div>
          </PulseGlassRow>
        </div>
      </div>

      {/* Closing brand statement — a large, faded wordmark as the very
          last thing on the page, the "final brand moment" pattern
          seen across polished SaaS/product footers. Decorative only
          (the real, accessible brand name is already in the column
          above), so it's hidden from assistive tech and doesn't
          repeat the page's landmark structure. Reuses Home.tsx's own
          tagline verbatim rather than inventing new marketing copy. */}
      <div aria-hidden style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 20px 28px', overflow: 'hidden' }}>
        <div className="site-footer-wordmark" style={{
          fontFamily: pulseFonts.display, fontWeight: 800, letterSpacing: 2,
          lineHeight: 1, whiteSpace: 'nowrap',
          background: `linear-gradient(135deg, ${ON_GRADIENT_BOTTOM.muted}, ${pt.cobalt}55)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          opacity: 0.5,
        }}>
          ZNU PULSE
        </div>
        <div style={{ color: ON_GRADIENT_BOTTOM.muted, fontSize: 12, fontWeight: 600, marginTop: 4 }}>
          Keep the pulse. Shape the future.
        </div>
      </div>
    </footer>
  )
}
