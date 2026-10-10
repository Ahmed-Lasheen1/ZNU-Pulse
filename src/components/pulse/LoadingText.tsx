import type { CSSProperties } from 'react'

const STYLES = `
  @keyframes skeletonFadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes skeletonPulse { 0%, 100% { opacity: 0.55 } 50% { opacity: 1 } }
  .pulse-skeleton { animation: skeletonFadeIn 0.25s ease 0.15s both; }
  .pulse-skeleton-block { animation: skeletonPulse 1.4s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) { .pulse-skeleton-block { animation: none; } }
`

const block: CSSProperties = { background: 'rgba(255,255,255,0.28)', borderRadius: 8 }

export default function LoadingText({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="pulse-skeleton" role="status" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{STYLES}</style>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderRadius: 18,
          background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.28)',
        }}>
          <div className="pulse-skeleton-block" style={{ ...block, width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="pulse-skeleton-block" style={{ ...block, height: 14, width: '60%' }} />
            <div className="pulse-skeleton-block" style={{ ...block, height: 11, width: '35%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
