import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../../premiumTheme'
import NavMenu from '../NavMenu'
import PulseBrand from './PulseBrand'

// Fixed, transparent brand bar used on every page except Home —
// now renders the SAME <PulseBrand> component Home itself uses
// (previously this hand-copied its own logo/text markup instead of
// importing PulseBrand, which is why the reload-on-click behavior
// added to PulseBrand's goHome() only ever worked on Home — every
// other page never rendered PulseBrand at all). Called with no
// `animation` prop, which routes PulseBrand into its plain,
// non-animated branch: no fade-in on route change (this bar persists
// across navigation, so replaying an entrance animation on every
// route change would just be visual noise), but the same click
// behavior, sizing conventions, and ON_GRADIENT_TOP color usage as
// before.
export default function PulseOverlayHeader({ dark, toggleTheme }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      zIndex: 500, pointerEvents: 'none'
    }}>
      <div className="pulse-wide" style={{
        // index.html now sets viewport-fit=cover so PulseBackground can
        // bleed under the notch/status bar — this fixed header would
        // otherwise bleed under it too, so its top padding grows by
        // env(safe-area-inset-top) to keep the brand/nav row clear of it.
        // Falls back to 0px on devices/browsers with no safe area, so
        // this is pixel-identical to before there.
        paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
        paddingBottom: 16,
        pointerEvents: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <PulseBrand dark={dark} />

          <NavMenu dark={dark} toggleTheme={toggleTheme} align="right" />
        </div>
      </div>
    </div>
  )
}
