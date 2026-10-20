// src/pages/AnonQuestions.tsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import { glassInput } from '../components/pulse/PulseUI'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PageShell from '../components/pulse/PageShell'
import PageIntro from '../components/pulse/PageIntro'
import { QuestionCardsSkeleton } from '../components/pulse/Skeletons'
import EmptyState from '../components/pulse/EmptyState'
import OfflineNote from '../components/pulse/OfflineNote'
import ErrorBanner from '../components/ErrorBanner'
import NotifyPermissionButton from '../components/NotifyPermissionButton'
import { useToast } from '../components/ToastProvider'
import ConfirmDialog from '../components/ConfirmDialog'
import AutoDirText from '../components/AutoDirText'
import { containsProfanity } from '../lib/moderation'
import { isSuccessMessage } from '../lib/messageStyle'
import { storageGet, storageSet } from '../lib/safeStorage'
import { networkFirst, cachedSnapshot } from '../lib/dataCache'
import { getMyAnonTokens, addMyAnonToken, getNotifiedTokens, markTokensNotified } from '../lib/anonTracking'
import { showLocalNotification } from '../lib/localNotification'
import { AnonQAIcon, QuestionMarkIcon, ClockIcon, CheckCircleIcon, TrashIcon, LightbulbIcon, EmptyBoxIcon } from '../components/ui/tool-icons'
import { Lock } from 'lucide-react'

const QNA_ACCENT = '#a78bfa'

const RECENT_QUESTIONS_LIMIT = 300

const SUBMIT_COOLDOWN_MS = 30_000
const COOLDOWN_STORAGE_KEY = 'anon_q_last_submit_at'

interface AnonQuestion {
  id: string
  question: string
  answer?: string | null
  answered: boolean
  tracking_token?: string | null
  created_at: string
}

// Anonymous Q&A page: students post questions anonymously and track replies; admins can answer or delete.
export default function AnonQuestions({ dark }: { dark: boolean }) {
  const { user, profile } = useAuth() as { user: any; profile?: { role?: string } | null }
  const isAdmin = profile?.role === 'admin'
  const pt = getPulseTheme(dark)
  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void

  const [questions, setQuestions] = useState<AnonQuestion[]>([])
  const [myQuestions, setMyQuestions] = useState<AnonQuestion[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)
  const [newQ, setNewQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [savedCopy, setSavedCopy] = useState(false)
  const [msg, setMsg] = useState('')
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval>>()
  // Blocks a rapid double-click before cooldown state re-renders.
  const submittingRef = useRef(false)

  useEffect(() => {
    let ignore = false
    openQuestions(() => ignore)
    fetchMyQuestions(() => ignore)
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    updateCooldownRemaining()
    cooldownTimerRef.current = setInterval(updateCooldownRemaining, 1000)
    return () => clearInterval(cooldownTimerRef.current)
  }, [])

  // Recomputes how many seconds remain before this device may submit another question.
  function updateCooldownRemaining() {
    const lastSubmitAt = Number(storageGet(COOLDOWN_STORAGE_KEY) || 0)
    const remaining = Math.max(0, SUBMIT_COOLDOWN_MS - (Date.now() - lastSubmitAt))
    setCooldownRemaining(remaining)
  }

  // Blocks an action when offline and shows a calm notice instead.
  function requireOnline() {
    if (navigator.onLine) return true
    showToast("You're offline — try again when you're connected", 'info')
    return false
  }

  // Goes through showLocalNotification() (can't throw on Chrome for Android).
  // Tokens are marked first so a re-run can't announce them twice.
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const notified = getNotifiedTokens()
    const newlyAnswered = myQuestions.filter(q =>
      q.tracking_token && q.answered && !notified.includes(q.tracking_token)
    )
    if (newlyAnswered.length > 0) {
      markTokensNotified(newlyAnswered.map(q => q.tracking_token as string))
      showLocalNotification('💬 ZNU Future Doctors', {
        body: newlyAnswered.length === 1
          ? 'Your anonymous question has been answered!'
          : `${newlyAnswered.length} of your anonymous questions have been answered!`,
        data: { url: '/anon-questions' },
      })
    }
  }, [myQuestions])

  // Loads the question list on page open: shows the saved copy at once, then refreshes it in the background.
  async function openQuestions(isIgnored: () => boolean = () => false) {
    setLoading(true)
    const { data, error, fromCache } = await cachedSnapshot('anon-questions', () => supabase
      .from('anonymous_questions')
      .select('id, question, answer, answered, created_at')
      .order('answered', { ascending: true })
      .order('created_at', { ascending: false })
      .range(0, RECENT_QUESTIONS_LIMIT - 1), {
        onUpdate: fresh => {
          if (isIgnored() || !fresh) return
          setQuestions(fresh as AnonQuestion[])
          setHasMore((fresh as AnonQuestion[]).length === RECENT_QUESTIONS_LIMIT)
          setSavedCopy(false)
        },
      })
    if (isIgnored()) return
    if (data) {
      setQuestions(data as AnonQuestion[])
      setHasMore((data as AnonQuestion[]).length === RECENT_QUESTIONS_LIMIT)
    }
    setSavedCopy(fromCache)
    if (error) console.warn('[AnonQuestions] Could not load the questions list:', error)
    setLoadError(!!error)
    setLoading(false)
  }

  // Fetches the newest questions from the server; used after submit and reply so the list is current.
  async function fetchQuestions(isIgnored: () => boolean = () => false) {
    setLoading(true)
    const { data, error, fromCache } = await networkFirst('anon-questions', () => supabase
      .from('anonymous_questions')
      .select('id, question, answer, answered, created_at')
      .order('answered', { ascending: true })
      .order('created_at', { ascending: false })
      .range(0, RECENT_QUESTIONS_LIMIT - 1))
    if (isIgnored()) return
    if (data) {
      setQuestions(data)
      setHasMore(data.length === RECENT_QUESTIONS_LIMIT)
    }
    setSavedCopy(fromCache)
    if (error) console.warn('[AnonQuestions] Could not load the questions list:', error)
    setLoadError(!!error)
    setLoading(false)
  }

  // Loads the next page of older questions.
  async function loadMoreQuestions() {
    if (loadingMore || !requireOnline()) return
    setLoadingMore(true)
    setLoadMoreError(false)
    const { data, error } = await supabase
      .from('anonymous_questions')
      .select('id, question, answer, answered, created_at')
      .order('answered', { ascending: true })
      .order('created_at', { ascending: false })
      .range(questions.length, questions.length + RECENT_QUESTIONS_LIMIT - 1)
    setLoadingMore(false)
    if (data) {
      setQuestions(prev => [...prev, ...data])
      setHasMore(data.length === RECENT_QUESTIONS_LIMIT)
    }
    if (error) setLoadMoreError(true)
  }

  // "My Questions" is a secondary section: if its request fails it must not
  // show the main "couldn't load questions" banner, so it only logs.
  async function fetchMyQuestions(isIgnored: () => boolean = () => false) {
    const myTokens = getMyAnonTokens()
    if (myTokens.length === 0) { if (!isIgnored()) setMyQuestions([]); return }
    const { data, error } = await networkFirst('anon-my-questions', () => supabase.rpc('get_my_anon_questions', { p_tokens: myTokens }))
    if (isIgnored()) return
    if (data) setMyQuestions(data)
    if (error) console.warn('[AnonQuestions] Could not load "My Questions":', error)
  }

  // Submits via the submit_anon_question RPC, which re-checks cooldown and
  // profanity server-side (the client pass is just fast feedback).
  async function submitQuestion() {
    if (!newQ.trim() || submittingRef.current) return
    if (!navigator.onLine) {
      setMsg("❌ You're offline — connect to submit your question")
      setTimeout(() => setMsg(''), 3000)
      return
    }
    if (cooldownRemaining > 0) {
      const seconds = Math.ceil(cooldownRemaining / 1000)
      setMsg(`❌ Please wait ${seconds}s before submitting another question`)
      setTimeout(() => setMsg(''), 3000)
      return
    }
    if (containsProfanity(newQ)) {
      setMsg('❌ Please remove inappropriate language from your question')
      setTimeout(() => setMsg(''), 3000)
      return
    }
    submittingRef.current = true
    const { data: token, error } = await supabase.rpc('submit_anon_question', { p_question: newQ.trim() })
    submittingRef.current = false
    if (!error && token) {
      storageSet(COOLDOWN_STORAGE_KEY, String(Date.now()))
      updateCooldownRemaining()
      addMyAnonToken(token)
      setMsg('✅ Question submitted anonymously!')
      setNewQ('')
      fetchQuestions()
      fetchMyQuestions()
      setTimeout(() => setMsg(''), 3000)
    } else {
      const busy = /wait|too many/i.test(error?.message || '')
      const inappropriate = /inappropriate/i.test(error?.message || '')
      setMsg(
        busy ? '❌ Too many questions right now — please try again in a moment'
        : inappropriate ? '❌ Please remove inappropriate language from your question'
        : '❌ Could not submit — check your connection and try again'
      )
      setTimeout(() => setMsg(''), 3000)
    }
  }

  // Saves an admin's reply to a question and reloads the list.
  async function submitReply(id: string) {
    const reply = replyText[id]
    if (!reply?.trim() || !requireOnline()) return
    const { error } = await supabase.from('anonymous_questions').update({ answer: reply, answered: true }).eq('id', id)
    if (error) { showToast('❌ Could not save reply — try again', 'error'); return }
    setReplyText(prev => ({ ...prev, [id]: '' }))
    fetchQuestions()
  }

  // Deletes a question (admin action) and reloads the list.
  async function deleteQuestion(id: string) {
    if (!requireOnline()) return
    const { error } = await supabase.from('anonymous_questions').delete().eq('id', id)
    if (error) { showToast('❌ Could not delete — try again', 'error'); return }
    fetchQuestions()
  }

  const answeredQs = questions.filter(q => q.answered)
  const unansweredQs = questions.filter(q => !q.answered)

  const isSuccess = isSuccessMessage(msg)
  const inStyle = { ...glassInput(pt, dark), padding: '13px 20px' }
  const submitDisabled = cooldownRemaining > 0
  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000)

  return (
    <PageShell dark={dark} backFallback="/" maxWidth={900}>
      <PageIntro dark={dark} emoji={<AnonQAIcon color={ON_GRADIENT_TOP.primary} size={40} />} title="Anonymous Questions" subtitle="Ask anything anonymously — no one knows who you are!" paddingBottom={16} />

      {loadError && <div style={{ marginBottom: 20 }}><ErrorBanner message="Couldn't load questions — check your connection." /></div>}
      {savedCopy && <OfflineNote dark={dark} message="You're offline — showing the last saved questions." />}

      <div style={{ marginBottom: 20 }}>
        <NotifyPermissionButton dark={dark} label="Notify me when my question is answered" />
      </div>

      {myQuestions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ ...pulseType.sectionLabel, color: QNA_ACCENT, marginBottom: 12 }}>🔎 My Questions (this device)</h3>
          {myQuestions.map((q, i) => {
            const isLast = i === myQuestions.length - 1
            return (
              <div key={q.id} style={{ marginBottom: isLast ? 0 : 10 }}>
                <LiquidGlassCard dark={dark} delay={i * 60} style={{
                  padding: '16px 18px',
                  boxShadow: `inset 0 0 0 1px ${q.answered ? 'rgba(74,222,128,0.35)' : 'transparent'}`
                }}>
                  <AutoDirText text={q.question} style={{ color: pt.textPrimary, fontSize: 13, marginBottom: 8 }} />
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                    background: q.answered ? 'rgba(74,222,128,0.16)' : `${pt.amber}20`,
                    color: q.answered ? '#4ade80' : pt.amber,
                    display: 'inline-flex', alignItems: 'center', gap: 5
                  }}>
                    {q.answered ? <CheckCircleIcon color="#4ade80" size={12} /> : <ClockIcon color={pt.amber} size={12} />}
                    {q.answered ? 'Answered' : 'Waiting for an answer'}
                  </span>
                  {q.answered && q.answer && (
                    <div style={{
                      background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)',
                      borderRadius: 10, padding: '10px 14px', marginTop: 10
                    }}>
                      <AutoDirText text={q.answer} style={{ color: pt.textPrimary, fontSize: 13 }} />
                    </div>
                  )}
                </LiquidGlassCard>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
          <h3 style={{ ...pulseType.sectionLabel, color: QNA_ACCENT, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <QuestionMarkIcon color={QNA_ACCENT} size={14} /> Ask a Question
          </h3>
          <textarea
            dir="auto"
            placeholder="Type your question here..."
            value={newQ} onChange={e => setNewQ(e.target.value)}
            style={{ ...inStyle, minHeight: 80, resize: 'vertical' }} />
          {msg && (
            <div style={{ color: isSuccess ? '#4ade80' : pt.danger, fontSize: 13, marginBottom: 8 }}>{msg}</div>
          )}
          <button onClick={submitQuestion} disabled={submitDisabled} style={{
            width: '100%', padding: '13px', background: QNA_ACCENT,
            border: 'none', borderRadius: 999, cursor: submitDisabled ? 'not-allowed' : 'pointer',
            opacity: submitDisabled ? 0.6 : 1,
            fontWeight: 700, color: '#0f172a', fontFamily: pulseFonts.body, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
            {submitDisabled ? `Please wait ${cooldownSeconds}s...` : (<>Submit Anonymously <Lock size={14} /></>)}
          </button>
        </LiquidGlassCard>
      </div>

      {isAdmin && (
        <div style={{ marginBottom: 24 }}>
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: '10px 16px', textAlign: 'center' }}>
            <span style={{ color: pt.cobalt, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CheckCircleIcon color={pt.cobalt} size={14} /> Admin Mode Active — replies you post here are visible to everyone
            </span>
          </LiquidGlassCard>
        </div>
      )}

      {isAdmin && unansweredQs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ ...pulseType.sectionLabel, color: pt.amber, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ClockIcon color={pt.amber} size={14} /> Unanswered ({unansweredQs.length})
          </h3>
          {unansweredQs.map((q, i) => {
            const isLast = i === unansweredQs.length - 1
            return (
              <div key={q.id} style={{ marginBottom: isLast ? 0 : 12 }}>
                <LiquidGlassCard dark={dark} delay={i * 60} style={{ padding: 18 }}>
                  <p style={{ color: pt.textPrimary, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <QuestionMarkIcon color={pt.textPrimary} size={15} />
                    <AutoDirText text={q.question} wrapperStyle={{ flex: 1 }} />
                  </p>
                  <textarea
                    dir="auto"
                    placeholder="Type your answer..."
                    value={replyText[q.id] || ''}
                    onChange={e => setReplyText(prev => ({ ...prev, [q.id]: e.target.value }))}
                    style={{ ...inStyle, minHeight: 60, resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => submitReply(q.id)} style={{
                      flex: 1, padding: '10px', background: '#22c55e',
                      border: 'none', borderRadius: 999, cursor: 'pointer',
                      fontWeight: 700, color: '#fff', fontFamily: pulseFonts.body,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}><CheckCircleIcon color="#fff" size={14} /> Answer</button>
                    <button onClick={() => setConfirmDeleteId(q.id)} aria-label="Delete question" style={{
                      padding: '10px 16px', background: 'rgba(239,107,87,0.14)',
                      border: '1px solid rgba(239,107,87,0.35)', borderRadius: 999, cursor: 'pointer',
                      color: pt.danger, fontFamily: pulseFonts.body, fontWeight: 700,
                      display: 'flex', alignItems: 'center'
                    }}><TrashIcon color={pt.danger} size={15} /></button>
                  </div>
                </LiquidGlassCard>
              </div>
            )
          })}
        </div>
      )}

      <div>
        <h3 style={{ ...pulseType.sectionLabel, color: '#4ade80', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircleIcon color="#4ade80" size={14} /> Answered Questions ({answeredQs.length})
        </h3>
        {loading && <QuestionCardsSkeleton />}
        {!loading && !loadError && answeredQs.length === 0 && (
          <EmptyState dark={dark} icon={<EmptyBoxIcon color={pt.sub} size={16} />} message="No answered questions yet" />
        )}
        {answeredQs.map((q, i) => {
          const isLast = i === answeredQs.length - 1
          return (
            <div key={q.id} style={{ marginBottom: isLast ? 0 : 12 }}>
              <LiquidGlassCard dark={dark} delay={i * 60} style={{ padding: 20 }}>
                <p style={{ color: pt.textPrimary, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <QuestionMarkIcon color={pt.textPrimary} size={15} />
                  <AutoDirText text={q.question} wrapperStyle={{ flex: 1 }} />
                </p>
                <div style={{
                  background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)',
                  borderRadius: 10, padding: '12px 16px'
                }}>
                  <div style={{ color: '#4ade80', fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <LightbulbIcon color="#4ade80" size={12} /> Answer
                  </div>
                  <AutoDirText text={q.answer || ''} style={{ color: pt.textPrimary, fontSize: 14 }} />
                </div>
                {isAdmin && (
                  <button onClick={() => setConfirmDeleteId(q.id)} style={{
                    marginTop: 8, padding: '6px 12px',
                    background: 'rgba(239,107,87,0.14)', border: '1px solid rgba(239,107,87,0.35)',
                    borderRadius: 8, cursor: 'pointer',
                    color: pt.danger, fontFamily: pulseFonts.body, fontSize: 12,
                    display: 'inline-flex', alignItems: 'center', gap: 5
                  }}><TrashIcon color={pt.danger} size={13} /> Delete</button>
                )}
              </LiquidGlassCard>
            </div>
          )
        })}
        {loadMoreError && <div style={{ marginTop: 16 }}><ErrorBanner message="Couldn't load more questions — check your connection." /></div>}
        {!loading && hasMore && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={loadMoreQuestions} disabled={loadingMore} style={{
              background: 'transparent', border: `1px solid ${pt.border}`, borderRadius: 999,
              padding: '8px 22px', color: pt.sub, cursor: loadingMore ? 'not-allowed' : 'pointer',
              fontFamily: pulseFonts.body, fontSize: 12, fontWeight: 700
            }}>{loadingMore ? 'Loading...' : 'Load more'}</button>
          </div>
        )}
      </div>

      <ConfirmDialog
        dark={dark}
        open={!!confirmDeleteId}
        title="Delete this question?"
        message="This cannot be undone."
        confirmLabel="Delete"
        confirmColor={pt.danger}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => { const id = confirmDeleteId; setConfirmDeleteId(null); if (id) deleteQuestion(id) }}
      />
    </PageShell>
  )
}
