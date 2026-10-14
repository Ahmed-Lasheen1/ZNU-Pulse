import type { CSSProperties, ReactNode } from 'react'
import { SKELETON_STYLES } from './LoadingText'

const BLOCK_BG = 'rgba(140,165,200,0.35)'
const card: CSSProperties = { borderRadius: 18, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.28)' }

export function Skeleton({ w = '100%', h = 14, r = 8, style }: { w?: number | string; h?: number; r?: number | string; style?: CSSProperties }) {
  return <div className="pulse-skeleton-block" style={{ width: w, height: h, borderRadius: r, background: BLOCK_BG, flexShrink: 0, ...style }} />
}

function Group({ label, className, style, children }: { label: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={`pulse-skeleton${className ? ` ${className}` : ''}`} role="status" aria-label={label} style={style}>
      <style>{SKELETON_STYLES}</style>
      {children}
    </div>
  )
}

function Rows({ count, pill }: { count: number; pill?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, borderRadius: pill ? 999 : 18, padding: pill ? '10px 18px 10px 10px' : '16px 20px' }}>
          <Skeleton w={pill ? 46 : 44} h={pill ? 46 : 44} r={pill ? '50%' : 12} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton w="60%" />
            <Skeleton w="35%" h={11} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CardRowsSkeleton({ count = 3, pill, label = 'Loading' }: { count?: number; pill?: boolean; label?: string }) {
  return <Group label={label}><Rows count={count} pill={pill} /></Group>
}

export function ReportGridSkeleton() {
  return (
    <Group label="Loading weekly report" className="pulse-report-grid">
      {[0, 1, 2, 3].map(i => (
        <div key={i}>
          <Skeleton w={i < 2 ? '55%' : '70%'} h={i < 2 ? 30 : 18} />
          <Skeleton w="75%" h={11} style={{ marginTop: 10 }} />
        </div>
      ))}
    </Group>
  )
}

export function PageSectionsSkeleton({ tiles = 3 }: { tiles?: number }) {
  return (
    <Group label="Loading content" style={{ marginBottom: 32 }}>
      <Skeleton w={110} h={12} style={{ marginBottom: 16 }} />
      <div className="auto-grid" style={{ ['--auto-grid-cols' as string]: tiles, marginBottom: 32 } as CSSProperties}>
        {Array.from({ length: tiles }, (_, i) => (
          <div key={i} style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Skeleton w={38} h={38} r="50%" />
            <Skeleton w="55%" h={13} />
          </div>
        ))}
      </div>
      <Skeleton w={130} h={12} style={{ marginBottom: 16 }} />
      <Rows count={2} />
    </Group>
  )
}

export function ProfileSkeleton() {
  return (
    <Group label="Loading profile" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...card, padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Skeleton w={180} h={30} />
        <Skeleton w={130} h={16} />
        <Skeleton w={130} h={40} r={999} />
      </div>
      <div style={{ ...card, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton w={150} h={14} />
          <Skeleton w={210} h={11} />
        </div>
        <Skeleton w={69} h={39} r={999} />
      </div>
      <div style={{ ...card, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <Skeleton w={90} h={13} />
            <Skeleton w={150} h={13} />
          </div>
        ))}
      </div>
    </Group>
  )
}

export function LeaderboardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Group label="Loading leaderboard" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...card, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Skeleton w={36} h={36} r="50%" />
          <Skeleton w="45%" h={16} />
          <div style={{ flex: 1 }} />
          <Skeleton w={72} h={26} r={999} />
        </div>
      ))}
    </Group>
  )
}

export function GradingSkeleton() {
  return (
    <Group label="Grading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
      <Skeleton w={160} h={11} />
      <Skeleton w={130} h={90} r={16} />
      <Skeleton w={110} h={12} />
      <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
        {[0, 1, 2].map(i => <Skeleton key={i} w={64} h={38} />)}
      </div>
    </Group>
  )
}

export function CardGridSkeleton({ count = 2 }: { count?: number }) {
  return (
    <Group label="Loading" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...card, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Skeleton w="40%" h={16} />
          <Skeleton h={12} />
          <Skeleton w="85%" h={12} />
          <Skeleton w="65%" h={12} />
        </div>
      ))}
    </Group>
  )
}
