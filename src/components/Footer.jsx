import { ON_GRADIENT_BOTTOM } from '../premiumTheme'

// The Footer renders in normal document flow, but the app's
// PulseBackground is `position: fixed; height: 100dvh` — it always
// covers whatever the current viewport shows, from the light top of
// its gradient to the dark bottom, regardless of scroll or theme. By
// the time a visitor scrolls this far, the Footer sits over the
// dark/lower portion of that gradient in both light and dark app
// themes (the gradient itself doesn't change with the theme toggle),
// so its text uses ON_GRADIENT_BOTTOM rather than the old invented
// slate grays.
//
// AUDIT FIX (footer invisible): PulseBackground is `position: fixed`
// with no z-index set. Per CSS stacking rules, a positioned element
// (even at the default z-index:auto) paints AFTER — i.e. on top of —
// plain in-flow, non-positioned content, regardless of DOM order.
// Every page already works around this by wrapping its own content in
// a `position: relative, zIndex: 1` div (see e.g. Home.tsx,
// ModulePage.tsx). Footer is rendered by App.jsx outside of any page's
// own wrapper, so without the same treatment it stayed a plain static
// block and was silently painted underneath the fixed background,
// making it completely invisible no matter how far you scrolled.
// Adding the identical `position: relative, zIndex: 1` here lifts it
// into the same stacking tier as the rest of the page content.
export default function Footer({ dark }) {
  return (
    <div style={{
      position: 'relative',
      zIndex: 1,
      textAlign: 'center',
      padding: '20px',
      borderTop: `1px solid ${dark ? '#1e3a5f' : '#e2e8f0'}`,
      color: ON_GRADIENT_BOTTOM.secondary,
      fontSize: 13,
      fontWeight: 600
    }}>
      Made with ❤️ by Ahmed Lasheen · ZNU Future Doctors
    </div>
  )
}
