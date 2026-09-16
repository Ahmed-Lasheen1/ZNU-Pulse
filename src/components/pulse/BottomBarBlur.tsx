// Bottom counterpart to StatusBarBlur.tsx — blends content into the
// home indicator / bottom Safari toolbar area instead of cutting off
// with a hard edge. Same technique: sized to the real safe-area
// inset, extended slightly past the edge, with a gradient mask that
// fades the blur out before it reaches real page content.
export default function BottomBarBlur() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        bottom: 'calc(-1 * env(safe-area-inset-bottom))',
        left: 0,
        right: 0,
        height: 'calc(env(safe-area-inset-bottom) * 2)',
        zIndex: 2000,
        pointerEvents: 'none',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        background: 'rgba(10, 15, 30, 0.35)',
        maskImage: 'linear-gradient(to top, black 0%, black 50%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to top, black 0%, black 50%, transparent 100%)',
      }}
    />
  )
}
