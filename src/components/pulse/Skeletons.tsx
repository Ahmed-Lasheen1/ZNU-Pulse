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

export function ChecklistSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Group label="Loading checklist" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
          <Skeleton w={26} h={26} r="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton w={i % 2 === 0 ? '62%' : '48%'} />
            <Skeleton w="28%" h={11} />
          </div>
          <Skeleton w={8} h={8} r="50%" />
          <Skeleton w={40} h={40} r="50%" />
        </div>
      ))}
    </Group>
  )
}

export function ScheduleSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Group label="Loading schedules" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...card, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px 10px 10px' }}>
          <Skeleton w={46} h={46} r="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton w="50%" />
            <Skeleton w="30%" h={11} />
          </div>
          <Skeleton w={76} h={34} r={10} />
        </div>
      ))}
    </Group>
  )
}

export function FilesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Group label="Loading files" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <Skeleton w={22} h={22} r={6} />
            <Skeleton w={i % 2 === 0 ? '55%' : '40%'} h={15} />
          </div>
          <Skeleton w={84} h={34} r={999} />
        </div>
      ))}
    </Group>
  )
}

export function SummaryListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Group label="Loading summaries" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
          <Skeleton w={40} h={40} r={12} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton w={i % 2 === 0 ? '68%' : '52%'} h={15} />
            <Skeleton w="28%" h={11} />
          </div>
          <Skeleton w={74} h={28} r={999} />
        </div>
      ))}
    </Group>
  )
}

export function QuestionCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Group label="Loading questions" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Skeleton w={15} h={15} r={4} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton w="88%" h={15} />
              <Skeleton w="55%" h={15} />
            </div>
          </div>
          <div style={{ borderRadius: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.14)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton w={64} h={11} />
            <Skeleton w="92%" />
            <Skeleton w="70%" />
          </div>
        </div>
      ))}
    </Group>
  )
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

export function PageSectionsSkeleton() {
  return (
    <Group label="Loading content" style={{ marginBottom: 32 }}>
      <Skeleton w={96} h={12} style={{ margin: '0 auto 14px' }} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <div style={{ ...card, borderRadius: 999, padding: 8, display: 'flex', gap: 6, maxWidth: '100%' }}>
          {[72, 104, 92].map((w, i) => <Skeleton key={i} w={w} h={50} r={999} />)}
        </div>
      </div>

      <Skeleton w={120} h={12} style={{ marginBottom: 16 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
            <Skeleton w={20} h={20} r={6} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton w="50%" h={14} />
              <Skeleton w="22%" h={11} />
            </div>
            <Skeleton w={16} h={16} r={4} />
            <Skeleton w={96} h={34} r={999} />
          </div>
        ))}
      </div>

      <Skeleton w={130} h={12} style={{ marginBottom: 16 }} />
      <div className="summary-practice-row">
        {[0, 1].map(i => (
          <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
            <Skeleton w={44} h={44} r={12} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton w="45%" h={15} />
              <Skeleton w="70%" h={11} />
            </div>
          </div>
        ))}
      </div>
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
