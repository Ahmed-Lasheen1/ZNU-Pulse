// src/pages/AnonQuestions.tsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP } from '../premiumTheme'
import { glassInput, glassPrimaryBtn } from '../components/pulse/PulseUI'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import PulseBackground from '../components/pulse/PulseBackground'
import BackButton from '../components/pulse/BackButton'
import PageIntro from '../components/pulse/PageIntro'
import NotifyPermissionButton from '../components/NotifyPermissionButton'
import { getMyAnonTokens, addMyAnonToken, getNotifiedTokens, markTokensNotified } from '../lib/anonTracking'
import { AnonQAIcon, QuestionMarkIcon, ClockIcon, CheckCircleIcon, TrashIcon, LightbulbIcon, EmptyBoxIcon } from '../components/ui/tool-icons'
import { Lock } from 'lucide-react'

const QNA_ACCENT = '#a78bfa'

// AUDIT FIX: this page has no admin gate at all — EVERY visitor
// (student or admin) triggers fetchQuestions() on every visit, and
// the query previously had no `.limit()` whatsoever. As the table
// grows across semesters, every single page load would eventually
// pull the ENTIRE anonymous_questions history for every single
// visitor. Capped here the same way every other list in the app
// already is (see LIST_LIMIT in src/pages/admin/adminStyles.js), but
// ordered unanswered-first so a pending question can never silently
// fall off the end of the window just because it's old — only excess
// already-answered history ever gets trimmed. (If the unanswered
// backlog itself ever exceeds this limit, that's a sign admins are
// badly behind, not a bug in this fetch.)
const RECENT_QUESTIONS_LIMIT = 300

// AUDIT FIX (pre-launch security audit — spam/abuse finding): there was
// previously no friction at all between submissions — a script (or a
// bored visitor) could call submitQuestion() in a tight loop and flood
// the table, since submissions require no account. This is a client-side
// courtesy cooldown only, not a real access-control boundary (anyone
// bypassing the UI entirely, e.g. by calling the Supabase client directly
// from devtools, isn't slowed down by it) — a proportionate fix for a
// student study app is to make accidental/casual spamming inconvenient
// through the normal UI, not to build server-side rate limiting for a
// problem that hasn't actually been observed yet. If real abuse shows up
// post-launch, move this enforcement server-side (e.g. a Postgres
// trigger keyed on a submitted device/session token) rather than relying
// on this alone.
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

export default function AnonQuestions({ dark }: { dark: boolean }) {
  const { user, profile } = useAuth() as { user: any; profile?: { role?: string } | null }
  const isAdmin = profile?.role === 'admin'
  const pt = getPulseTheme(dark)

  const [questions, setQuestions] = useState<AnonQuestion[]>([])
  const [myQuestions, setMyQuestions] = useState<AnonQuestion[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [newQ, setNewQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => { fetchQuestions(); fetchMyQuestions() }, [])

  // Restores an in-progress cooldown across a page reload — without this,
  // reloading the page would silently reset the timer and defeat the
  // whole point of the cooldown.
  useEffect(() => {
    updateCooldownRemaining()
    cooldownTimerRef.current = setInterval(updateCooldownRemaining, 1000)
    return () => clearInterval(cooldownTimerRef.current)
  }, [])

  function updateCooldownRemaining() {
    const lastSubmitAt = Number(localStorage.getItem(COOLDOWN_STORAGE_KEY) || 0)
    const remaining = Math.max(0, SUBMIT_COOLDOWN_MS - (Date.now() - lastSubmitAt))
    setCooldownRemaining(remaining)
  }

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const notified = getNotifiedTokens()
    const newlyAnswered = myQuestions.filter(q =>
      q.tracking_token && q.answered && !notified.includes(q.tracking_token)
    )
    if (newlyAnswered.length > 0) {
      newlyAnswered.forEach(() => {
        new Notification('💬 ZNU Future Doctors', { body: 'Your anonymous question has been answered!' })
      })
      markTokensNotified(newlyAnswered.map(q => q.tracking_token as string))
    }
  }, [myQuestions])

  async function fetchQuestions() {
    setLoading(true)
    const { data } = await supabase
      .from('anonymous_questions')
      .select('id, question, answer, answered, created_at')
      .order('answered', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(RECENT_QUESTIONS_LIMIT)
    if (data) {
      setQuestions(data)
      setHasMore(data.length === RECENT_QUESTIONS_LIMIT)
    }
    setLoading(false)
  }

  async function fetchMyQuestions() {
    const myTokens = getMyAnonTokens()
    if (myTokens.length === 0) { setMyQuestions([]); return }
    const { data } = await supabase.rpc('get_my_anon_questions', { p_tokens: myTokens })
    if (data) setMyQuestions(data)
  }

  async function submitQuestion() {
    if (!newQ.trim()) return
    if (cooldownRemaining > 0) {
      const seconds = Math.ceil(cooldownRemaining / 1000)
      setMsg(`❌ Please wait ${seconds}s before submitting another question`)
      setTimeout(() => setMsg(''), 3000)
      return
    }
    const token = crypto.randomUUID()
    const { error } = await supabase.from('anonymous_questions').insert([{ question: newQ.trim(), tracking_token: token }])
    if (!error) {
      localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now()))
      updateCooldownRemaining()
      addMyAnonToken(token)
      setMsg('✅ Question submitted anonymously!')
      setNewQ('')
      fetchQuestions()
      fetchMyQuestions()
      setTimeout(() => setMsg(''), 3000)
    }
  }

  async function submitReply(id: string) {
    const reply = replyText[id]
    if (!reply?.trim()) return
    const { error } = await supabase.from('anonymous_questions').update({ answer: reply, answered: true }).eq('id', id)
    if (!error) {
      setReplyText(prev => ({ ...prev, [id]: '' }))
      fetchQuestions()
    }
  }

  async function deleteQuestion(id: string) {
    await supabase.from('anonymous_questions').delete().eq('id', id)
    fetchQuestions()
  }

  const answeredQs = questions.filter(q => q.answered)
  const unansweredQs = questions.filter(q => !q.answered)

  const isSuccess = msg.includes('✅')
  const inStyle = { ...glassInput(pt, dark), padding: '13px 20px' }
  const submitDisabled = cooldownRemaining > 0
  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000)

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div className="pulse-wide" style={{ position: 'relative', zIndex: 1, padding: '24px 20px 100px', fontFamily: pulseFonts.body }}>

        <div style={{ marginBottom: 8 }}>
          <BackButton dark={dark} fallback="/" />
        </div>

        <PageIntro dark={dark} emoji={<AnonQAIcon color={ON_GRADIENT_TOP.primary} size={40} />} title="Anonymous Questions" subtitle="Ask anything anonymously — no one knows who you are!" paddingBottom={16} />

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
                    <p style={{ color: pt.textPrimary, fontSize: 13, marginBottom: 8 }}>{q.question}</p>
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
                        <p style={{ color: pt.textPrimary, fontSize: 13 }}>{q.answer}</p>
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
                      <QuestionMarkIcon color={pt.textPrimary} size={15} /> <span>{q.question}</span>
                    </p>
                    <textarea
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
                      <button onClick={() => deleteQuestion(q.id)} aria-label="Delete question" style={{
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
          {loading && <p style={{ color: ON_GRADIENT_TOP.secondary, textAlign: 'center' }}>Loading...</p>}
          {!loading && answeredQs.length === 0 && (
            <LiquidGlassCard dark={dark} delay={0} style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: pt.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <EmptyBoxIcon color={pt.sub} size={16} /> No answered questions yet
              </p>
            </LiquidGlassCard>
          )}
          {answeredQs.map((q, i) => {
            const isLast = i === answeredQs.length - 1
            return (
              <div key={q.id} style={{ marginBottom: isLast ? 0 : 12 }}>
                <LiquidGlassCard dark={dark} delay={i * 60} style={{ padding: 20 }}>
                  <p style={{ color: pt.textPrimary, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <QuestionMarkIcon color={pt.textPrimary} size={15} /> <span>{q.question}</span>
                  </p>
                  <div style={{
                    background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)',
                    borderRadius: 10, padding: '12px 16px'
                  }}>
                    <div style={{ color: '#4ade80', fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <LightbulbIcon color="#4ade80" size={12} /> Answer
                    </div>
                    <p style={{ color: pt.textPrimary, fontSize: 14 }}>{q.answer}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteQuestion(q.id)} style={{
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
          {!loading && hasMore && (
            <p style={{ color: pt.sub, fontSize: 11, textAlign: 'center', marginTop: 12 }}>
              Showing the {RECENT_QUESTIONS_LIMIT} most recent questions.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
