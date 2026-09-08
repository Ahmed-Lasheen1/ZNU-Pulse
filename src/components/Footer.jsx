import { useNavigate } from 'react-router-dom'
import { getPulseTheme, pulseFonts, ON_GRADIENT_BOTTOM } from '../premiumTheme'
import PulseGlassRow from './pulse/PulseGlassRow'
import { HomeIcon, ScheduleIcon, ChecklistIcon, AnonQAIcon } from './ui/tool-icons'
import { ExamIcon } from '../lib/medicalIcons'

const LOGO_SRC = '/icon-192.png'

// Same reasoning as Home.tsx's FOOTER_LINE_COLOR: the footer always
// sits on the dark/lower portion of the fixed PULSE_BG gradient,
// regardless of the app's light/dark theme toggle (the gradient
// itself never changes with that toggle) — so the divider is frozen
// to the dark-mode value rather than reading a Liquid Glass token
// that would otherwise flip with the theme.
const DIVIDER_COLOR = getPulseTheme(true).border
const HOVER_TINT = 'rgba(255,255,255,0.08)'

// Trimmed to the handful of links people actually reach for from a
// footer, not a full sitemap — a student study app doesn't need a
// four-column mega-footer.
const QUICK_LINKS = [
  { label: 'Home', to: '/', Icon: HomeIcon },
  { label: 'Schedule', to: '/schedule', Icon: ScheduleIcon },
  { label: 'Checklist', to: '/checklist', Icon: ChecklistIcon },
  { label: 'MCQ Bank', to: '/mcq', Icon: ExamIcon },
  { label: 'Anonymous Q&A', to: '/anon-questions', Icon: AnonQAIcon },
]

export default function Footer({ dark }) {
  const navigate = useNavigate()
  const pt = getPulseTheme(dark)
  const year = new Date().getFullYear()

  function goTo(path) {
    navigate(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer style={{
      position: 'relative',
      zIndex: 1,
      borderTop: `1px solid ${DIVIDER_COLOR}`,
      fontFamily: pulseFonts.body,
    }}>
      <style>{`
        .site-footer-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-wrap: wrap; padding: 18px 0;
        }
        .site-footer-links { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        @media (max-width: 720px) {
          .site-footer-row { flex-direction: column; text-align: center; }
        }
      `}</style>

      <div className="pulse-wide" style={{ padding: '0 20px' }}>
        <div className="site-footer-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
              background: pt.surfaceFlat, border: `1px solid ${pt.cobaltBorder}`,
            }}>
              <img src={LOGO_SRC} alt="ZNU Pulse" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <span style={{
              fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 14, letterSpacing: 0.5,
              color: ON_GRADIENT_BOTTOM.primary,
            }}>
              ZNU <span style={{ color: pt.cobalt }}>PULSE</span>
            </span>
          </div>

          <div className="site-footer-links">
            {QUICK_LINKS.map(({ label, to, Icon }) => (
              <PulseGlassRow key={to} dark={true} radius={999} hoverTint={HOVER_TINT} onClick={() => goTo(to)}
                role="button" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(to) } }}>
                <div style={{
                  padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6,
                  color: ON_GRADIENT_BOTTOM.secondary, fontSize: 12, fontWeight: 600,
                }}>
                  <Icon color={ON_GRADIENT_BOTTOM.muted} size={13} />
                  {label}
                </div>
              </PulseGlassRow>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: DIVIDER_COLOR }} />

        <div style={{ padding: '12px 0', textAlign: 'center', color: ON_GRADIENT_BOTTOM.muted, fontSize: 12, fontWeight: 600 }}>
          © {year} ZNU Pulse · Made with ❤️ by Ahmed Lasheen
        </div>
      </div>
    </footer>
  )
}
