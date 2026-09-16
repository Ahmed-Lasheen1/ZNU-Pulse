// Manually recreates a short, faded blur behind the iOS status bar
// for installed PWAs (black-translucent gives NO blur on its own —
// it's fully see-through, so without this, header content and the
// status bar's time/battery text just overlap with nothing helping
// legibility). Sized to the real safe-area inset only, with a
// gradient mask so the blur dissolves into the page instead of
// cutting off with a hard edge — this is what keeps it from
// "reaching down" into the header below it.
export default function StatusBarBlur() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 'calc(-1 * env(safe-area-inset-top))',
        left: 0,
        right: 0,
        height: 'calc(env(safe-area-inset-top) * 2)',
        zIndex: 2000, // above page content, below modals/overlays if needed
        pointerEvents: 'none',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        background: 'rgba(10, 15, 30, 0.35)',
        maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
      }}
    />
  )
}
