import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../../premiumTheme'
import NavMenu from '../NavMenu'

const LOGO_SRC = '/icon-192.png'

// Fixed, transparent brand bar used on every page except Home —
// identical sizing, copy, and layout to Home's own fixed header block
// (see Home.tsx / PulseBrand.tsx's animated markup), but rendered
// statically with no fade-in: this bar persists across navigation, so
// replaying an entrance animation on every route change would just be
// visual noise rather than a first-impression moment like on Home.
//
// This bar always sits on the light/top portion of the fixed PULSE_BG
// gradient, so its plain text uses ON_GRADIENT_TOP rather than the
// Liquid Glass tokens — same reasoning as PulseBrand.tsx, which this
// mirrors. `pt` is still used only for the decorative logo chip.
export default function PulseOverlayHeader({ dark, toggleTheme }) {
  const pt = getPulseTheme(false)

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      zIndex: 500, pointerEvents: 'none'
    }}>
      <div className="pulse-wide" style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 16,
        pointerEvents: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, flexShrink: 0,
              borderRadius: 12, overflow: 'hidden',
              background: pt.surfaceFlat, border: `1px solid ${pt.cobaltBorder}`,
            }}>
              <img src={LOGO_SRC} alt="ZNU Pulse" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div>
              <div style={{
                ...pulseType.sectionTitle,
                fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 20, letterSpacing: 1.2,
                color: ON_GRADIENT_TOP.primary, lineHeight: 1
              }}>
                ZNU <span style={{ color: pt.cobalt }}>PULSE</span>
              </div>
              <div style={{
                ...pulseType.sectionLabel,
                fontSize: 9, letterSpacing: 2.5,
                color: ON_GRADIENT_TOP.muted, marginTop: 5,
              }}>For Future Doctors</div>
            </div>
          </div>

          <NavMenu dark={dark} toggleTheme={toggleTheme} align="right" />
        </div>
      </div>
    </div>
  )
}
