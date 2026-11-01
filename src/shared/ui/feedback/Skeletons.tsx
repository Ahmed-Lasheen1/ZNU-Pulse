import type { CSSProperties, ReactNode } from 'react'
import { SKELETON_STYLES } from '@/shared/ui/feedback/LoadingText'

const BLOCK_BG = 'rgba(140,165,200,0.35)'
const glass: CSSProperties = { background: 'rgba(255,255,255,0.14)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.28)' }
const card: CSSProperties = { ...glass, borderRadius: 18 }

export function Skeleton({ w = '100%', h = 14, r = 8, style }: { w?: number | string; h?: number; r?: number | string; style?: CSSProperties }) {
  return <div className="pulse-skeleton-block" style={{ width: w, height: h, borderRadius: r, background: BLOCK_BG, flexShrink: 0, ...style }} />
}

function Line({ lh, mt = 0, children }: { lh: number; mt?: number; children: ReactNode }) {
  return <div style={{ height: lh, marginTop: mt, display: 'flex', alignItems: 'center' }}>{children}</div>
}

function Group({ label, className, style, children }: { label: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={`pulse-skeleton${className ? ` ${className}` : ''}`} role="status" aria-label={label} style={style}>
      <style>{SKELETON_STYLES}</style>
      {children}
    </div>
  )
}

type RowsVariant = 'subject' | 'admin' | 'tree'

function Rows({ count, pill, variant }: { count: number; pill?: boolean; variant: RowsVariant }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: pill ? 12 : 10 }}>
      {Array.from({ length: count }, (_, i) => {
        if (pill) {
          return (
            <div key={i} style={{ ...glass, borderRadius: 999, padding: '10px 18px 10px 10px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Skeleton w={46} h={46} r="50%" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Line lh={20.8}><Skeleton w="45%" h={15} /></Line>
                <Line lh={17.5} mt={2}><Skeleton w="80%" h={11} /></Line>
              </div>
              <Skeleton w={8} h={8} r="50%" />
            </div>
          )
        }
        if (variant === 'admin') {
          return (
            <div key={i} style={{ ...card, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <Skeleton w={14} h={14} r={4} />
                <Skeleton w="40%" h={14} />
                <Skeleton w="22%" h={11} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Skeleton w={38} h={26} r={10} />
                <Skeleton w={38} h={26} r={10} />
              </div>
            </div>
          )
        }
        if (variant === 'tree') {
          return (
            <div key={i} style={{ ...card, padding: '8px 10px' }}>
              <div style={{ padding: '5px 7px', display: 'flex', alignItems: 'center', gap: 6, height: 42 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, padding: '0 2px' }}>
                  <Skeleton w={16} h={16} r={4} />
                  <Skeleton w={20} h={20} r={6} />
                  <Skeleton w="40%" h={14} />
                  <div style={{ flex: 1 }} />
                  <Skeleton w={90} h={11} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {[0, 1, 2, 3].map(b => <Skeleton key={b} w={28} h={26} r={10} />)}
                </div>
              </div>
            </div>
          )
        }
        return (
          <div key={i} style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Skeleton w={18} h={18} r={5} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Line lh={17.6}><Skeleton w="50%" h={13} /></Line>
              <Line lh={14.5} mt={1}><Skeleton w="22%" h={10} /></Line>
            </div>
            <Skeleton w={96} h={31} r={999} />
          </div>
        )
      })}
    </div>
  )
}

export function CardRowsSkeleton({ count = 3, pill, variant = 'subject', label = 'Loading' }: { count?: number; pill?: boolean; variant?: RowsVariant; label?: string }) {
  return <Group label={label}><Rows count={count} pill={pill} variant={variant} /></Group>
}

export function ChecklistSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Group label="Loading checklist" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
          <Skeleton w={26} h={26} r="50%" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Line lh={18}><Skeleton w={i % 2 === 0 ? '62%' : '48%'} h={13} /></Line>
            <Line lh={14} mt={2}><Skeleton w="28%" h={10} /></Line>
          </div>
          <Skeleton w={8} h={8} r="50%" />
          <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Skeleton w={15} h={15} r={4} />
          </div>
        </div>
      ))}
    </Group>
  )
}

export function ScheduleSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Group label="Loading schedules" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...glass, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px 10px 10px' }}>
          <Skeleton w={46} h={46} r="50%" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Line lh={20.8}><Skeleton w="50%" h={15} /></Line>
            <Line lh={17.5} mt={2}><Skeleton w="30%" h={11} /></Line>
          </div>
          <Skeleton w={74} h={31} r={10} />
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
            <Line lh={20.8}><Skeleton w={i % 2 === 0 ? '55%' : '40%'} h={15} /></Line>
          </div>
          <Skeleton w={84} h={32} r={999} />
        </div>
      ))}
    </Group>
  )
}

export function SummaryListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Group label="Loading summaries" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: 'clamp(14px, 3vw, 18px) clamp(14px, 3vw, 22px)' }}>
          <Skeleton w={40} h={40} r={12} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Line lh={19.5}><Skeleton w={i % 2 === 0 ? '68%' : '52%'} h={14} /></Line>
            <Line lh={17.5} mt={2}><Skeleton w="28%" h={11} /></Line>
          </div>
          <Skeleton w={74} h={27} r={999} />
        </div>
      ))}
    </Group>
  )
}

export function QuestionCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Group label="Loading questions" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
            <div style={{ height: 20, display: 'flex', alignItems: 'center' }}><Skeleton w={15} h={15} r={4} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Line lh={20}><Skeleton w="88%" h={14} /></Line>
              <Line lh={20}><Skeleton w="55%" h={14} /></Line>
            </div>
          </div>
          <div style={{ borderRadius: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <Line lh={15}><Skeleton w={64} h={11} /></Line>
            <Line lh={17.6} mt={4}><Skeleton w="92%" h={12} /></Line>
            <Line lh={17.6}><Skeleton w="70%" h={12} /></Line>
          </div>
        </div>
      ))}
    </Group>
  )
}

export function ReportGridSkeleton() {
  return (
    <Group label="Loading weekly report" className="pulse-report-grid">
      <div>
        <Line lh={30.8}><Skeleton w={72} h={24} /></Line>
        <Line lh={17.5} mt={4}><Skeleton w="85%" h={11} /></Line>
        <div style={{ marginTop: 6 }}><Skeleton w={118} h={22} r={999} /></div>
      </div>
      <div>
        <Line lh={30.8}><Skeleton w={44} h={24} /></Line>
        <Line lh={17.5} mt={4}><Skeleton w="80%" h={11} /></Line>
      </div>
      <div>
        <Line lh={19.5}><Skeleton w="70%" h={14} /></Line>
        <Line lh={15.4} mt={4}><Skeleton w="55%" h={10} /></Line>
      </div>
      <div>
        <div style={{ height: 22, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Skeleton w={16} h={21} r={4} />
          <Skeleton w={24} h={18} />
        </div>
        <Line lh={15.4} mt={4}><Skeleton w="55%" h={10} /></Line>
      </div>
    </Group>
  )
}

export function PageSectionsSkeleton() {
  return (
    <Group label="Loading content" style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <Line lh={15}><Skeleton w={96} h={11} /></Line>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <div style={{ ...glass, borderRadius: 999, padding: 8, display: 'flex', gap: 6, maxWidth: '100%' }}>
          {[72, 104, 92].map((w, i) => <Skeleton key={i} w={w} h={50} r={999} />)}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Line lh={15}><Skeleton w={120} h={11} /></Line>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
            <Skeleton w={20} h={20} r={6} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Line lh={17.6}><Skeleton w="50%" h={13} /></Line>
              <Line lh={14.4} mt={1}><Skeleton w="22%" h={10} /></Line>
            </div>
            <Skeleton w={16} h={16} r={4} />
            <Skeleton w={96} h={31} r={999} />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <Line lh={15}><Skeleton w={130} h={11} /></Line>
      </div>
      <div className="summary-practice-row">
        {[0, 1].map(i => (
          <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
            <Skeleton w={44} h={44} r={12} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Line lh={20.8}><Skeleton w="45%" h={15} /></Line>
              <Line lh={17.5} mt={2}><Skeleton w="70%" h={11} /></Line>
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
      <div style={{ ...card, padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Line lh={39}><Skeleton w={200} h={30} style={{ maxWidth: '100%' }} /></Line>
        <Line lh={21.4} mt={8}><Skeleton w={150} h={16} /></Line>
        <div style={{ marginTop: 16 }}><Skeleton w={130} h={42} r={999} /></div>
      </div>

      <div style={{ ...card, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Line lh={20.8}><Skeleton w="55%" h={14} /></Line>
          <Line lh={17.5} mt={2}><Skeleton w="80%" h={11} /></Line>
        </div>
        <Skeleton w={69} h={39} r={999} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Skeleton w={240} h={34} r={999} style={{ maxWidth: '100%' }} />
      </div>

      <div style={{ ...card, padding: '20px 22px' }}>
        <div style={{ height: 25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Skeleton w={130} h={14} />
          <Skeleton w={58} h={25} r={8} />
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
            borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.18)' : 'none',
          }}>
            <Skeleton w={90} h={12} />
            <Skeleton w={150} h={12} />
          </div>
        ))}
      </div>

      <Skeleton w="100%" h={46} r={999} />
    </Group>
  )
}

export function LeaderboardSkeleton({ count = 10 }: { count?: number }) {
  return (
    <Group label="Loading leaderboard" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...card, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Skeleton w={36} h={36} r="50%" />
          <Line lh={22.1}><Skeleton w="45%" h={16} /></Line>
          <div style={{ flex: 1 }} />
          <Skeleton w={72} h={24} r={999} />
        </div>
      ))}
    </Group>
  )
}

export function GradingSkeleton() {
  return (
    <Group label="Grading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '19px 0 20px' }}>
      <Line lh={14}><Skeleton w={150} h={10} /></Line>
      <div style={{ marginTop: 2 }}>
        <Skeleton w="clamp(90px, 18vw, 170px)" h={0} r={16} style={{ height: 'clamp(52px, 11vw, 104px)' }} />
      </div>
      <Line lh={15} mt={4}><Skeleton w={120} h={11} /></Line>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Line lh={27.7}><Skeleton w={40} h={22} /></Line>
            <Line lh={12.6} mt={2}><Skeleton w={56} h={9} /></Line>
          </div>
        ))}
      </div>
    </Group>
  )
}

export function CardGridSkeleton({ count = 2 }: { count?: number }) {
  return (
    <Group label="Loading" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ ...card, padding: '20px 22px' }}>
          <Line lh={24}><Skeleton w="40%" h={16} /></Line>
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <Line lh={16.4}><Skeleton w="92%" h={11} /></Line>
            <Line lh={16.4}><Skeleton w="60%" h={11} /></Line>
          </div>
          {[0, 1, 2].map(r => (
            <div key={r} style={{ marginBottom: 12 }}>
              <div style={{ height: 15, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Skeleton w="35%" h={11} />
                <Skeleton w={56} h={11} />
              </div>
              <Skeleton h={6} r={999} />
            </div>
          ))}
        </div>
      ))}
    </Group>
  )
}
