import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useAuth } from '../../contexts'
import { getPulseTheme, pulseFonts, pulseType } from '../../premiumTheme'
import { glassInput } from '../../components/pulse/PulseUI'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import EmptyState from '../../components/pulse/EmptyState'
import OfflineNote from '../../components/pulse/OfflineNote'
import { CardRowsSkeleton } from '../../components/pulse/Skeletons'
import ErrorBanner from '../../components/ErrorBanner'
import ConfirmDialog from '../../components/ConfirmDialog'
import AutoDirText from '../../components/AutoDirText'
import { useToast } from '../../components/ToastProvider'
import { networkFirst } from '../../lib/dataCache'
import { getGuestToken } from '../../lib/pollIdentity'
import { wrapText } from '../../lib/textStyles'
import { PlusIcon, TrashIcon, CheckCircleIcon, ClockIcon, EmptyBoxIcon } from '../../components/ui/tool-icons'

interface PollOption {
  id: string
  label: string
  votes: number | null
}

interface Poll {
  id: string
  title: string
  closes_at: string | null
  closed: boolean
  my_vote: string | null
  show_results: boolean
  total: number | null
  options: PollOption[]
}

interface OptionDraft {
  id: string
  value: string
}

interface PollsSectionProps {
  dark: boolean
  accent: string
  isAdmin: boolean
}

const REFRESH_MS = 15000
const MIN_OPTIONS = 2
const MAX_OPTIONS = 6

const newOption = (): OptionDraft => ({ id: crypto.randomUUID(), value: '' })

const closesLabel = (iso: string) =>
  new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function PollsSection({ dark, accent, isAdmin }: PollsSectionProps) {
  const { user } = useAuth() as { user: { id: string } | null }
  const pt = getPulseTheme(dark)
  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void
  const cacheKey = user ? `user:${user.id}:polls` : 'polls'

  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [savedCopy, setSavedCopy] = useState(false)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState<OptionDraft[]>(() => [newOption(), newOption()])
  const [closesAt, setClosesAt] = useState('')
  const [creating, setCreating] = useState(false)

  async function loadPolls(isIgnored: () => boolean = () => false, silent = false) {
    if (!silent) setLoading(true)
    const { data, error, fromCache } = await networkFirst(cacheKey, () =>
      supabase.rpc('get_polls', { p_guest_token: getGuestToken() })
    )
    if (isIgnored()) return
    if (data) setPolls(data as Poll[])
    setSavedCopy(fromCache)
    setLoadError(!!error && !data)
    setLoading(false)
  }

  useEffect(() => {
    let ignore = false
    loadPolls(() => ignore)
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) loadPolls(() => ignore, true)
    }, REFRESH_MS)
    return () => { ignore = true; clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  function requireOnline() {
    if (navigator.onLine) return true
    showToast("You're offline — try again when you're connected", 'info')
    return false
  }

  async function vote(poll: Poll, optionId: string) {
    if (votingId || poll.closed || poll.my_vote === optionId || !requireOnline()) return
    setVotingId(poll.id)
    const { error } = await supabase.rpc('vote_poll', {
      p_poll_id: poll.id,
      p_option_id: optionId,
      p_guest_token: getGuestToken(),
    })
    setVotingId(null)
    if (error) showToast(/closed/i.test(error.message) ? 'This poll just closed' : '❌ Could not save your vote — try again', 'error')
    else showToast(poll.my_vote ? 'Vote changed' : '✅ Vote saved')
    loadPolls(() => false, true)
  }

  function resetForm() {
    setTitle('')
    setOptions([newOption(), newOption()])
    setClosesAt('')
    setFormOpen(false)
  }

  async function createPoll() {
    if (creating || !requireOnline()) return
    const labels = options.map(o => o.value.trim()).filter(Boolean)
    if (!title.trim()) return showToast('❌ Add a question for the poll', 'error')
    if (labels.length < MIN_OPTIONS) return showToast(`❌ Add at least ${MIN_OPTIONS} options`, 'error')
    if (closesAt && new Date(closesAt).getTime() <= Date.now()) return showToast('❌ The closing time must be in the future', 'error')

    setCreating(true)
    const { error } = await supabase.rpc('admin_create_poll', {
      p_title: title.trim(),
      p_options: labels,
      p_closes_at: closesAt ? new Date(closesAt).toISOString() : null,
    })
    setCreating(false)
    if (error) return showToast('❌ ' + error.message, 'error')
    showToast('✅ Poll created')
    resetForm()
    loadPolls(() => false, true)
  }

  async function toggleClosed(poll: Poll) {
    if (!requireOnline()) return
    const { error } = await supabase.rpc('admin_set_poll_closed', { p_poll_id: poll.id, p_closed: !poll.closed })
    if (error) return showToast('❌ Could not update the poll — try again', 'error')
    showToast(poll.closed ? 'Poll reopened' : 'Poll closed')
    loadPolls(() => false, true)
  }

  async function deletePoll(id: string) {
    if (!requireOnline()) return
    const { error } = await supabase.rpc('admin_delete_poll', { p_poll_id: id })
    if (error) return showToast('❌ Could not delete — try again', 'error')
    showToast('Poll deleted')
    loadPolls(() => false, true)
  }

  const inStyle = { ...glassInput(pt, dark), padding: '12px 18px', marginBottom: 0 }
  const pillBtn = (color: string) => ({
    background: 'transparent', border: `1px solid ${color}66`, color, borderRadius: 999,
    padding: '6px 14px', cursor: 'pointer', fontFamily: pulseFonts.body, fontSize: 12, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: 5,
  } as const)

  return (
    <div>
      {loadError && <div style={{ marginBottom: 16 }}><ErrorBanner message="Couldn't load polls — check your connection." /></div>}
      {savedCopy && <OfflineNote dark={dark} message="You're offline — showing the last saved polls." />}

      {isAdmin && (
        <div style={{ marginBottom: 20 }}>
          {!formOpen ? (
            <button onClick={() => setFormOpen(true)} style={{
              ...pillBtn(accent), width: '100%', justifyContent: 'center', padding: '12px', borderStyle: 'dashed',
            }}>
              <PlusIcon color={accent} size={12} /> New poll
            </button>
          ) : (
            <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
              <h3 style={{ ...pulseType.sectionLabel, color: accent, marginBottom: 14 }}>New poll</h3>
              <input
                dir="auto" placeholder="What do you want to ask?" value={title} maxLength={200}
                onChange={e => setTitle(e.target.value)} style={{ ...inStyle, marginBottom: 10 }}
              />
              {options.map((o, i) => (
                <div key={o.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    dir="auto" placeholder={`Option ${i + 1}`} value={o.value} maxLength={120}
                    onChange={e => setOptions(prev => prev.map(x => x.id === o.id ? { ...x, value: e.target.value } : x))}
                    style={{ ...inStyle, flex: 1, minWidth: 0 }}
                  />
                  {options.length > MIN_OPTIONS && (
                    <button
                      onClick={() => setOptions(prev => prev.filter(x => x.id !== o.id))}
                      aria-label={`Remove option ${i + 1}`} style={pillBtn(pt.danger)}
                    ><TrashIcon color={pt.danger} size={13} /></button>
                  )}
                </div>
              ))}
              {options.length < MAX_OPTIONS && (
                <button onClick={() => setOptions(prev => [...prev, newOption()])} style={{ ...pillBtn(pt.sub), marginBottom: 14 }}>
                  <PlusIcon color={pt.sub} size={11} /> Add option
                </button>
              )}
              <label style={{ ...pulseType.small, color: pt.textMuted, display: 'block', marginBottom: 6 }}>Closes at (optional)</label>
              <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} style={{ ...inStyle, marginBottom: 16 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={resetForm} disabled={creating} style={{ ...pillBtn(pt.sub), flex: 1, justifyContent: 'center', padding: '11px' }}>Cancel</button>
                <button onClick={createPoll} disabled={creating} style={{
                  flex: 2, padding: '11px', borderRadius: 999, border: 'none', background: accent, color: '#0f172a',
                  fontWeight: 700, fontSize: 14, fontFamily: pulseFonts.body,
                  cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1,
                }}>{creating ? 'Creating...' : 'Create poll'}</button>
              </div>
            </LiquidGlassCard>
          )}
        </div>
      )}

      {loading && polls.length === 0 && <CardRowsSkeleton count={2} label="Loading polls" />}

      {!loading && polls.length === 0 && !loadError && (
        <EmptyState dark={dark} icon={<EmptyBoxIcon color={pt.sub} size={16} />} message="No polls yet" />
      )}

      {polls.map((poll, i) => {
        const isVoting = votingId === poll.id
        const total = poll.total ?? 0
        return (
          <div key={poll.id} style={{ marginBottom: i === polls.length - 1 ? 0 : 14 }}>
            <LiquidGlassCard dark={dark} delay={i * 60} style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                  background: poll.closed ? (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : `${accent}22`,
                  color: poll.closed ? pt.textMuted : accent,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  {poll.closed ? <CheckCircleIcon color={pt.textMuted} size={12} /> : <ClockIcon color={accent} size={12} />}
                  {poll.closed ? 'Closed' : poll.closes_at ? `Closes ${closesLabel(poll.closes_at)}` : 'Open'}
                </span>
              </div>

              <AutoDirText text={poll.title} style={{ ...pulseType.cardTitle, color: pt.textPrimary, marginBottom: 14, ...wrapText }} />

              {poll.options.map(option => {
                const selected = poll.my_vote === option.id
                const votes = option.votes ?? 0
                const percent = total > 0 ? Math.round((votes / total) * 100) : 0
                return (
                  <button
                    key={option.id} type="button" aria-pressed={selected}
                    disabled={poll.closed || isVoting} onClick={() => vote(poll, option.id)}
                    style={{
                      position: 'relative', overflow: 'hidden', width: '100%', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', marginBottom: 8,
                      borderRadius: 12, fontFamily: pulseFonts.body, color: pt.textPrimary,
                      cursor: poll.closed ? 'default' : 'pointer', opacity: isVoting ? 0.7 : 1,
                      background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: `1.5px solid ${selected ? accent : pt.border}`,
                    }}
                  >
                    {poll.show_results && (
                      <span aria-hidden style={{
                        position: 'absolute', top: 0, bottom: 0, left: 0, width: `${percent}%`,
                        background: `${accent}${selected ? '40' : '26'}`, transition: 'width 0.4s ease',
                      }} />
                    )}
                    <span dir="auto" style={{ position: 'relative', flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, ...wrapText }}>{option.label}</span>
                    {selected && <span style={{ position: 'relative', display: 'inline-flex' }}><CheckCircleIcon color={accent} size={15} /></span>}
                    {poll.show_results && (
                      <span style={{ position: 'relative', fontSize: 12, fontWeight: 700, color: pt.textSecondary, whiteSpace: 'nowrap' }}>
                        {percent}% · {votes}
                      </span>
                    )}
                  </button>
                )
              })}

              <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 4 }}>
                {poll.show_results
                  ? `${total} vote${total === 1 ? '' : 's'}${!poll.closed && poll.my_vote ? ' · tap another option to change your vote' : ''}`
                  : 'Vote to see the results'}
              </div>

              {isAdmin && (
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={() => toggleClosed(poll)} style={pillBtn(pt.sub)}>{poll.closed ? 'Reopen' : 'Close poll'}</button>
                  <button onClick={() => setConfirmDeleteId(poll.id)} style={pillBtn(pt.danger)}>
                    <TrashIcon color={pt.danger} size={12} /> Delete
                  </button>
                </div>
              )}
            </LiquidGlassCard>
          </div>
        )
      })}

      <ConfirmDialog
        dark={dark}
        open={!!confirmDeleteId}
        title="Delete this poll?"
        message="Its votes will be deleted too. This cannot be undone."
        confirmLabel="Delete"
        confirmColor={pt.danger}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => { const id = confirmDeleteId; setConfirmDeleteId(null); if (id) deletePoll(id) }}
      />
    </div>
  )
}
