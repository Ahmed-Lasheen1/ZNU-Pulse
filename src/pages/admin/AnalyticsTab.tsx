import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme } from '../../premiumTheme'
import { watchOnlineCount } from '../../lib/onlinePresence'
import { ModuleIcon } from '../../lib/medicalIcons'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import AdminStatusCard from './AdminStatusCard'
import ErrorBanner from '../../components/ErrorBanner'
import { DotIcon, PeopleIcon, BellIcon, ChartBarIcon, ConstructionIcon } from '../../components/ui/tool-icons'
import type { PulseTheme } from './adminStyles'
import type { AdminModule } from './adminTypes'

interface DifficultyRow {
  question_id: string
  question: string
  module_id: string
  incorrect_count: number
  total_attempts: number
  error_rate: number
}

interface StatCardProps {
  label: string
  Icon: (p: { color: string; size?: number }) => JSX.Element
  value: number | string
  color: string
  pt: PulseTheme
  dark: boolean
  loading: boolean
}

function StatCard({ label, Icon, value, color, dark, loading }: StatCardProps) {
  const pt = getPulseTheme(dark)
  return (
    <LiquidGlassCard dark={dark} delay={0} style={{ padding: '18px 20px', textAlign: 'center', flex: '1 1 140px' }}>
      <div style={{ color, fontWeight: 900, fontSize: 26 }}>
        {loading ? '…' : value}
      </div>
      <div style={{ color: pt.textMuted, fontSize: 12, fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <Icon color={pt.textMuted} size={12} /> {label}
      </div>
    </LiquidGlassCard>
  )
}

interface AnalyticsTabProps {
  dark: boolean
  modules: AdminModule[]
}

export default function AnalyticsTab({ dark, modules }: AnalyticsTabProps) {
  const pt = getPulseTheme(dark)
  const [difficulty, setDifficulty] = useState<DifficultyRow[]>([])
  const [difficultyLoading, setDifficultyLoading] = useState(false)
  const [difficultyError, setDifficultyError] = useState(false)

  const [onlineCount, setOnlineCount] = useState(0)
  const [accountCount, setAccountCount] = useState(0)
  const [notifCount, setNotifCount] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)

  useEffect(() => { fetchDifficulty() }, [])
  useEffect(() => { fetchOverviewStats() }, [])

  useEffect(() => {
    let unwatch = () => {}
    try {
      unwatch = watchOnlineCount(setOnlineCount) || (() => {})
    } catch (e) {
      console.warn('[AnalyticsTab] Could not watch online count:', e)
    }
    return () => {
      try { unwatch() } catch { /* noop */ }
    }
  }, [])

  async function fetchDifficulty() {
    setDifficultyLoading(true)
    setDifficultyError(false)
    try {
      const { data, error } = await supabase.rpc('get_question_difficulty', { p_min_attempts: 3 })
      if (!error && data) setDifficulty(data)
      else if (error) setDifficultyError(true)
    } catch (e) {
      console.warn('[AnalyticsTab] Could not load question difficulty:', e)
      setDifficultyError(true)
    }
    setDifficultyLoading(false)
  }

  async function fetchOverviewStats() {
    setStatsLoading(true)
    setStatsError(false)
    try {
      const [accountsRes, notifRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }),
      ])
      if (accountsRes.error || notifRes.error) setStatsError(true)
      setAccountCount(accountsRes?.count ?? 0)
      setNotifCount(notifRes?.count ?? 0)
    } catch (e) {
      console.warn('[AnalyticsTab] Could not load overview stats:', e)
      setStatsError(true)
      setAccountCount(0)
      setNotifCount(0)
    }
    setStatsLoading(false)
  }

  return (
    <div>
      {statsError && <div style={{ marginBottom: 16 }}><ErrorBanner message="Couldn't load some stats — check your connection." /></div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <StatCard label="Online Now" Icon={DotIcon} value={onlineCount} color="#22c55e" pt={pt} dark={dark} loading={false} />
        <StatCard label="Registered Accounts" Icon={PeopleIcon} value={accountCount} color={pt.cobalt} pt={pt} dark={dark} loading={statsLoading} />
        <StatCard label="Notifications Enabled" Icon={BellIcon} value={notifCount} color={pt.amber} pt={pt} dark={dark} loading={statsLoading} />
      </div>
      <p style={{ color: pt.textMuted, fontSize: 11, marginBottom: 20, textAlign: 'center' }}>
        "Online Now" counts open browser tabs on the site right now (a person with two tabs open counts twice).
        "Notifications Enabled" counts devices that turned on push notifications, including guest devices.
      </p>

      <div style={{ marginBottom: 16 }}>
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
          <h3 style={{ color: pt.cobalt, marginBottom: 8, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ChartBarIcon color={pt.cobalt} size={18} /> Hardest Questions
          </h3>
          <p style={{ color: pt.textMuted, fontSize: 13 }}>
            Questions with the highest wrong-answer rate across all students (minimum 3 attempts).
            Worth double-checking these for a wording issue or a wrong answer key.
          </p>
        </LiquidGlassCard>
      </div>

      {difficultyError && <div style={{ marginBottom: 16 }}><ErrorBanner message="Couldn't load hardest questions — check your connection." /></div>}

      {difficultyLoading && <p style={{ color: pt.sub, textAlign: 'center' }}>Loading...</p>}

      {!difficultyLoading && !difficultyError && difficulty.length === 0 && (
        <AdminStatusCard dark={dark} message={<><ConstructionIcon color={pt.sub} size={14} /> Not enough attempts yet to report on</>} />
      )}

      <div className="admin-list-grid">
        <style>{`
          @media (min-width: 1300px) { .admin-list-grid { grid-template-columns: 1fr 1fr; gap: 10px; } }
        `}</style>
        {difficulty.map(row => {
          const mod = modules.find(m => m.id === row.module_id)
          return (
            <LiquidGlassCard key={row.question_id} dark={dark} delay={0} style={{
              padding: '14px 18px', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  color: pt.text, fontWeight: 600, fontSize: 13,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>{row.question}</div>
                <div style={{ color: pt.textMuted, fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {mod && <><ModuleIcon value={mod.icon} size={11} color={pt.textMuted} /> {mod.name} ·</>} {row.incorrect_count}/{row.total_attempts} wrong
                </div>
              </div>
              <div style={{
                background: row.error_rate >= 70 ? 'rgba(239,68,68,0.16)' : `${pt.amber}22`,
                color: row.error_rate >= 70 ? pt.danger : pt.amber,
                borderRadius: 20, padding: '4px 12px', fontWeight: 900, fontSize: 13, flexShrink: 0
              }}>{row.error_rate}%</div>
            </LiquidGlassCard>
          )
        })}
      </div>
    </div>
  )
}
