import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/core/supabase'
import { useAuth } from '@/core/contexts'
import { getPulseTheme, pulseFonts, pulseType, ON_BACKGROUND } from '@/shared/theme/premiumTheme'
import { adaptColor } from '@/shared/theme/adaptColor'
import { glassInput } from '@/shared/ui/glass/PulseUI'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import PageShell from '@/shared/ui/layout/PageShell'
import PageIntro from '@/shared/ui/layout/PageIntro'
import PulseGlassRow from '@/shared/ui/glass/PulseGlassRow'
import { QuestionCardsSkeleton } from '@/shared/ui/feedback/Skeletons'
import EmptyState from '@/shared/ui/feedback/EmptyState'
import OfflineNote from '@/shared/ui/feedback/OfflineNote'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import { NotifyPermissionButton } from '@/features/notifications'
import { useToast } from '@/shared/ui/feedback/ToastProvider'
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog'
import AutoDirText from '@/shared/ui/display/AutoDirText'
import DateStamp from '@/shared/ui/display/DateStamp'
import PollsSection from '@/features/tools/pulse-check/PollsSection'
import { containsProfanity } from '@/shared/utils/moderation'
import { isSuccessMessage } from '@/shared/utils/messageStyle'
import { storageGet, storageSet } from '@/core/safeStorage'
import { networkFirst, cachedSnapshot } from '@/core/dataCache'
import { getMyAnonTokens, addMyAnonToken, getNotifiedTokens, markTokensNotified } from '@/features/tools/pulse-check/anonTracking'
import { showLocalNotification } from '@/services/notifications/localNotification'
import { getSwRegistration } from '@/services/notifications/pushNotifications'
import { isArabicText, textDir, ARABIC_FONT } from '@/shared/utils/bidi'
import { AnonQAIcon, QuestionMarkIcon, ClockIcon, CheckCircleIcon, TrashIcon, LightbulbIcon, EmptyBoxIcon, ChartBarIcon } from '@/shared/icons/tool-icons'
import { Lock } from 'lucide-react'
import { glassHoverTint } from '@/shared/theme/liquidGlass'

const QUESTIONS_ACCENT = '#a78bfa'
const POLLS_ACCENT = '#2dd4bf'

const RECENT_QUESTIONS_LIMIT = 300
const INPUT_FONT_SIZE = 16

const SUBMIT_COOLDOWN_MS = 30_000
const COOLDOWN_STORAGE_KEY = 'anon_q_last_submit_at'

type PulseTab = 'polls' | 'questions'

const TABS: { id: PulseTab; label: string; accent: string; Icon: (p: { color: string; size?: number }) => JSX.Element }[] = [
  { id: 'polls', label: 'Polls', accent: POLLS_ACCENT, Icon: ChartBarIcon },
  { id: 'questions', label: 'Questions', accent: QUESTIONS_ACCENT, Icon: QuestionMarkIcon },
]

interface AnonQuestion {
  id: string
  question: string
  answer?: string | null
  answered: boolean
  tracking_token?: string | null
  created_at: string
}

// Lets the server push the answer to this device later; null when push isn't on.
async function currentPushEndpoint(): Promise<string | null> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return null
  try {
    const reg = await getSwRegistration(1500)
    const sub = reg ? await reg.pushManager.getSubscription() : null
    return sub?.endpoint ?? null
  } catch {
    return null
  }
}

// Tells admins a new question arrived (best effort).
function pingAdmins(token: string) {
  fetch('/api/push/notify-admins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).catch(() => {})
}

// Tells the asker their question was answered (best effort).
async function pingAsker(questionId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/push/notify-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ question_id: questionId }),
    })
  } catch {
    // best effort: the answer itself is already saved
  }
}

// Pulse Check page: anonymous polls and questions, with admin tools to answer and manage them.
export default function PulseCheck({ dark }: { dark: boolean }) {
  const { user, profile } = useAuth() as { user: any; profile?: { role?: string } | null }
  const isAdmin = profile?.role === 'admin'
  const pt = getPulseTheme(dark)
  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void
  const location = useLocation()

  // Status colors follow the color mode; the suffixes are opacities (10%, 16%, 25%, 35%).
  const okColor = pt.success
  const okSoft = `${pt.success}1A`
  const okTint = `${pt.success}29`
  const okBorder = `${pt.success}40`
  const okRing = `${pt.success}59`
  const dangerTint = `${pt.danger}24`
  const dangerBorder = `${pt.danger}59`
  // The violet accent as text color (fills keep the original).
  const questionsText = adaptColor(QUESTIONS_ACCENT, dark)

  // Old links used ?tab=ask and ?tab=answered; both now land on Questions.
  const [tab, setTab] = useState<PulseTab>(() => {
    const requested = new URLSearchParams(location.search).get('tab')
    return requested === 'questions' || requested === 'ask' || requested === 'answered' ? 'questions' : 'polls'
  })
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
  const msgTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const submittingRef = useRef(false)

  // Shows a short message under the form that clears itself after 3 seconds.
  function flashMsg(text: string) {
    clearTimeout(msgTimerRef.current)
    setMsg(text)
    msgTimerRef.current = setTimeout(() => setMsg(''), 3000)
  }

  // Loads the public questions and this device's own messages.
  useEffect(() => {
    let ignore = false
    openQuestions(() => ignore)
    fetchMyQuestions(() => ignore)
    return () => { ignore = true }
  }, [])

  // Ticks the submit cooldown every second.
  useEffect(() => {
    updateCooldownRemaining()
    cooldownTimerRef.current = setInterval(updateCooldownRemaining, 1000)
    return () => {
      clearInterval(cooldownTimerRef.current)
      clearTimeout(msgTimerRef.current)
    }
  }, [])

  // Recomputes the time left before another question can be sent.
  function updateCooldownRemaining() {
    const lastSubmitAt = Number(storageGet(COOLDOWN_STORAGE_KEY) || 0)
    const remaining = Math.max(0, SUBMIT_COOLDOWN_MS - (Date.now() - lastSubmitAt))
    setCooldownRemaining(remaining)
  }

  // Returns true when online; otherwise shows a toast and returns false.
  function requireOnline() {
    if (navigator.onLine) return true
    showToast("You're offline — try again when you're connected", 'info')
    return false
  }

  // Shows a local notification when one of this device's questions has just been answered.
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const notified = getNotifiedTokens()
    const newlyAnswered = myQuestions.filter(q =>
      q.tracking_token && q.answered && !notified.includes(q.tracking_token)
    )
    if (newlyAnswered.length > 0) {
      markTokensNotified(newlyAnswered.map(q => q.tracking_token as string))
      showLocalNotification('💬 Pulse Check', {
        body: newlyAnswered.length === 1
          ? 'Your question has been answered!'
          : `${newlyAnswered.length} of your questions have been answered!`,
        data: { url: '/pulse-check?tab=questions' },
      })
    }
  }, [myQuestions])

  // Loads the questions list (saved copy first, then fresh).
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
    if (error) console.warn('[PulseCheck] Could not load the questions list:', error)
    setLoadError(!!error)
    setLoading(false)
  }

  // Reloads the questions list from the server (saved copy only when offline).
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
    if (error) console.warn('[PulseCheck] Could not load the questions list:', error)
    setLoadError(!!error)
    setLoading(false)
  }

  // Loads the next page of questions.
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

  // Loads the questions this device sent, using the saved tracking tokens.
  async function fetchMyQuestions(isIgnored: () => boolean = () => false) {
    const myTokens = getMyAnonTokens()
    if (myTokens.length === 0) { if (!isIgnored()) setMyQuestions([]); return }
    const { data, error } = await networkFirst('anon-my-questions', () => supabase.rpc('get_my_anon_questions', { p_tokens: myTokens }))
    if (isIgnored()) return
    if (data) setMyQuestions(data)
    if (error) console.warn('[PulseCheck] Could not load "My Questions":', error)
  }

  // Sends the typed question anonymously after the cooldown, language and connection checks.
  async function submitQuestion() {
    if (!newQ.trim() || submittingRef.current) return
    if (!navigator.onLine) {
      flashMsg("❌ You're offline — connect to submit")
      return
    }
    if (cooldownRemaining > 0) {
      flashMsg(`❌ Please wait ${Math.ceil(cooldownRemaining / 1000)}s before submitting another one`)
      return
    }
    if (containsProfanity(newQ)) {
      flashMsg('❌ Please remove inappropriate language')
      return
    }
    submittingRef.current = true
    const endpoint = await currentPushEndpoint()
    const { data: token, error } = await supabase.rpc('submit_anon_question', { p_question: newQ.trim(), p_endpoint: endpoint })
    submittingRef.current = false
    if (!error && token) {
      storageSet(COOLDOWN_STORAGE_KEY, String(Date.now()))
      updateCooldownRemaining()
      addMyAnonToken(token)
      pingAdmins(token)
      setNewQ('')
      fetchQuestions()
      fetchMyQuestions()
      flashMsg('✅ Sent anonymously!')
    } else {
      const busy = /wait|too many/i.test(error?.message || '')
      const inappropriate = /inappropriate/i.test(error?.message || '')
      flashMsg(
        busy ? '❌ Too many messages right now — please try again in a moment'
        : inappropriate ? '❌ Please remove inappropriate language'
        : '❌ Could not send — check your connection and try again'
      )
    }
  }

  // Saves an admin's answer to a question and notifies the asker.
  async function submitReply(id: string) {
    const reply = replyText[id]
    if (!reply?.trim() || !requireOnline()) return
    const { error } = await supabase.from('anonymous_questions').update({ answer: reply, answered: true }).eq('id', id)
    if (error) { showToast('❌ Could not save reply — try again', 'error'); return }
    pingAsker(id)
    setReplyText(prev => ({ ...prev, [id]: '' }))
    fetchQuestions()
  }

  // Deletes a question (admin).
  async function deleteQuestion(id: string) {
    if (!requireOnline()) return
    const { error } = await supabase.from('anonymous_questions').delete().eq('id', id)
    if (error) { showToast('❌ Could not delete — try again', 'error'); return }
    fetchQuestions()
  }

  const answeredQs = questions.filter(q => q.answered)
  const unansweredQs = questions.filter(q => !q.answered)

  const isSuccess = isSuccessMessage(msg)
  const inStyle = { ...glassInput(pt, dark), padding: '13px 20px', fontSize: INPUT_FONT_SIZE }
  const arabicFont = (text: string) => (isArabicText(text) ? { fontFamily: ARABIC_FONT } : {})
  const submitDisabled = cooldownRemaining > 0
  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000)
  const hoverTint = glassHoverTint(dark)

  return (
    <PageShell dark={dark} backFallback="/" maxWidth={900}>
      <PageIntro
        dark={dark}
        emoji={<AnonQAIcon color={ON_BACKGROUND.primary} size={40} />}
        title="Pulse Check"
        subtitle="Vote, ask and suggest — all anonymous"
        paddingBottom={16}
      />

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const active = tab === t.id
          const color = active ? (dark ? '#ffffff' : '#062B50') : pt.sub
          const badge = isAdmin && t.id === 'questions' ? unansweredQs.length : 0
          return (
            <PulseGlassRow
              key={t.id} dark={dark} radius={999} active={active}
              activeTint={`${t.accent}33`} hoverTint={hoverTint}
              onClick={() => setTab(t.id)} role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTab(t.id) } }}
            >
              <div style={{ padding: '10px 22px', ...pulseType.button, color, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                <t.Icon color={color} size={15} /> {t.label}
                {badge > 0 && (
                  <span style={{ background: pt.amber, color: dark ? '#0f172a' : '#ffffff', borderRadius: 999, padding: '0 7px', fontSize: 11, fontWeight: 800 }}>{badge}</span>
                )}
              </div>
            </PulseGlassRow>
          )
        })}
      </div>

      {tab === 'polls' && <PollsSection dark={dark} accent={POLLS_ACCENT} isAdmin={isAdmin} />}

      {tab === 'questions' && (
        <>
          {loadError && <div style={{ marginBottom: 20 }}><ErrorBanner message="Couldn't load questions — check your connection." /></div>}
          {savedCopy && <OfflineNote dark={dark} message="You're offline — showing the last saved questions." />}

          <div style={{ marginBottom: 20 }}>
            <NotifyPermissionButton dark={dark} label="Notify me when I get an answer" />
          </div>

          <div style={{ marginBottom: 24 }}>
            <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
              <h3 style={{ ...pulseType.sectionLabel, color: questionsText, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <QuestionMarkIcon color={questionsText} size={14} /> Ask a question or share a suggestion
              </h3>
              <textarea
                dir="auto"
                placeholder="Ask anything, or suggest an idea for the platform..."
                value={newQ} onChange={e => setNewQ(e.target.value)}
                style={{ ...inStyle, ...arabicFont(newQ), minHeight: 80, resize: 'vertical' }} />
              {msg && (
                <div style={{ color: isSuccess ? okColor : pt.danger, fontSize: 13, marginBottom: 8 }}>{msg}</div>
              )}
              <button onClick={submitQuestion} disabled={submitDisabled} style={{
                width: '100%', padding: '13px', background: QUESTIONS_ACCENT,
                border: 'none', borderRadius: 999, cursor: submitDisabled ? 'not-allowed' : 'pointer',
                opacity: submitDisabled ? 0.6 : 1,
                fontWeight: 700, color: '#0f172a', fontFamily: pulseFonts.body, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
                {submitDisabled ? `Please wait ${cooldownSeconds}s...` : (<>Send Anonymously <Lock size={14} /></>)}
              </button>
            </LiquidGlassCard>
          </div>

          {myQuestions.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ ...pulseType.sectionLabel, color: questionsText, marginBottom: 12 }}>🔎 My Messages (this device)</h3>
              {myQuestions.map((q, i) => {
                const isLast = i === myQuestions.length - 1
                return (
                  <div key={q.id} style={{ marginBottom: isLast ? 0 : 10 }}>
                    <LiquidGlassCard dark={dark} delay={i * 60} style={{
                      padding: '16px 18px',
                      boxShadow: `inset 0 0 0 1px ${q.answered ? okRing : 'transparent'}`
                    }}>
                      <div dir={textDir(q.question)}>
                        <AutoDirText text={q.question} style={{ color: pt.textPrimary, fontSize: 13, marginBottom: 8 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                            background: q.answered ? okTint : `${pt.amber}20`,
                            color: q.answered ? okColor : pt.amber,
                            display: 'inline-flex', alignItems: 'center', gap: 5
                          }}>
                            {q.answered ? <CheckCircleIcon color={okColor} size={12} /> : <ClockIcon color={pt.amber} size={12} />}
                            {q.answered ? 'Answered' : 'Waiting for an answer'}
                          </span>
                          <DateStamp value={q.created_at} color={pt.textMuted} />
                        </div>
                      </div>
                      {q.answered && q.answer && (
                        <div dir={textDir(q.answer)} style={{
                          background: okSoft, border: `1px solid ${okBorder}`,
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
                const draft = replyText[q.id] || ''
                return (
                  <div key={q.id} style={{ marginBottom: isLast ? 0 : 12 }}>
                    <LiquidGlassCard dark={dark} delay={i * 60} style={{ padding: 18 }}>
                      <div dir={textDir(q.question)} style={{ color: pt.textPrimary, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ flexShrink: 0, display: 'inline-flex', paddingTop: 3 }}>
                          <QuestionMarkIcon color={pt.textPrimary} size={15} />
                        </span>
                        <AutoDirText text={q.question} wrapperStyle={{ flex: 1, minWidth: 0 }} />
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <DateStamp value={q.created_at} color={pt.textMuted} />
                      </div>
                      <textarea
                        dir="auto"
                        placeholder="Type your answer..."
                        value={draft}
                        onChange={e => setReplyText(prev => ({ ...prev, [q.id]: e.target.value }))}
                        style={{ ...inStyle, ...arabicFont(draft), minHeight: 60, resize: 'vertical' }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => submitReply(q.id)} style={{
                          flex: 1, padding: '10px', background: dark ? '#22c55e' : pt.success,
                          border: 'none', borderRadius: 999, cursor: 'pointer',
                          fontWeight: 700, color: '#fff', fontFamily: pulseFonts.body,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}><CheckCircleIcon color="#fff" size={14} /> Answer</button>
                        <button onClick={() => setConfirmDeleteId(q.id)} aria-label="Delete question" style={{
                          padding: '10px 16px', background: dangerTint,
                          border: `1px solid ${dangerBorder}`, borderRadius: 999, cursor: 'pointer',
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
            <h3 style={{ ...pulseType.sectionLabel, color: okColor, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircleIcon color={okColor} size={14} /> Answered ({answeredQs.length})
            </h3>
            {loading && <QuestionCardsSkeleton />}
            {!loading && !loadError && answeredQs.length === 0 && (
              <EmptyState dark={dark} icon={<EmptyBoxIcon color={pt.sub} size={16} />} message="No answers yet" />
            )}
            {answeredQs.map((q, i) => {
              const isLast = i === answeredQs.length - 1
              return (
                <div key={q.id} style={{ marginBottom: isLast ? 0 : 12 }}>
                  <LiquidGlassCard dark={dark} delay={i * 60} style={{ padding: 20 }}>
                    <div dir={textDir(q.question)} style={{ color: pt.textPrimary, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ flexShrink: 0, display: 'inline-flex', paddingTop: 3 }}>
                        <QuestionMarkIcon color={pt.textPrimary} size={15} />
                      </span>
                      <AutoDirText text={q.question} wrapperStyle={{ flex: 1, minWidth: 0 }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <DateStamp value={q.created_at} color={pt.textMuted} />
                    </div>
                    <div dir={textDir(q.answer || '')} style={{
                      background: okSoft, border: `1px solid ${okBorder}`,
                      borderRadius: 10, padding: '12px 16px'
                    }}>
                      <div style={{ color: okColor, fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <LightbulbIcon color={okColor} size={12} /> Answer
                      </div>
                      <AutoDirText text={q.answer || ''} style={{ color: pt.textPrimary, fontSize: 14 }} />
                    </div>
                    {isAdmin && (
                      <button onClick={() => setConfirmDeleteId(q.id)} style={{
                        marginTop: 8, padding: '6px 12px',
                        background: dangerTint, border: `1px solid ${dangerBorder}`,
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
        </>
      )}

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
