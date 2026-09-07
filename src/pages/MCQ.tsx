// src/pages/MCQ.tsx
import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth, useModules } from '../contexts'
import { useToast } from '../components/ToastProvider'
import { fetchModuleStages } from '../lib/moduleStages'
import {
  getGuestFlags, toggleGuestFlag,
  saveGuestIncorrect, enrichGuestFlagsWithResults,
  addGuestHistory
} from '../lib/reviewStorage'
import { loadSavedActiveExam, persistActiveExam, clearActiveExam } from '../lib/activeExam'
import { MOCK_MINUTES, optionLabels } from './mcq/mcqShared'
import MCQBrowse from './mcq/MCQBrowse'
import MCQExamFlow from './mcq/MCQExamFlow'

export default function MCQ({ dark }: { dark: boolean }) {
  const { user, fetchProfile } = useAuth() as any
  const { modules, modulesLoaded, modulesError } = useModules() as any
  const location = useLocation()
  const navigate = useNavigate()
  const showToast = useToast() as (message: string, type?: 'success' | 'error') => void

  const [subjects, setSubjects] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set())
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [activeStage, setActiveStage] = useState(() => {
    const params = new URLSearchParams(location.search)
    return params.get('stage') || 'all'
  })
  const [activeSubject, setActiveSubject] = useState('all')
  const [stages, setStages] = useState<any[]>([])
  const [lessonFilter] = useState(() => new URLSearchParams(location.search).get('lesson') || null)
  const [subjectFilter] = useState(() => new URLSearchParams(location.search).get('subject') || null)
  const [quizMode, setQuizMode] = useState<string | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [grading, setGrading] = useState(false)
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [finishTimeSec, setFinishTimeSec] = useState(0)
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set())
  const [resumeData, setResumeData] = useState<any>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [struckOut, setStruckOut] = useState<Record<number, Set<string>>>({})
  // Adjustable text size for the question/answer text — matches
  // ExamSoft's "Adjust Text Size" control, a standard accessibility
  // feature on every reference exam platform. Persisted like the
  // app's existing theme preference (localStorage, not per-account).
  const FONT_SCALES = [0.9, 1, 1.15, 1.3]
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('znu_mcq_font_scale') : null
    const parsed = saved ? parseFloat(saved) : 1
    return FONT_SCALES.includes(parsed) ? parsed : 1
  })
  useEffect(() => { localStorage.setItem('znu_mcq_font_scale', String(fontScale)) }, [fontScale])
  function cycleFontScale() {
    setFontScale(prev => FONT_SCALES[(FONT_SCALES.indexOf(prev) + 1) % FONT_SCALES.length])
  }
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const quizStartedAtRef = useRef<number | null>(null)
  const [usingCache, setUsingCache] = useState(false)

  useEffect(() => {
    fetchSubjects()
    fetchLessons()
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (user) fetchAnsweredIds() }, [user])

  useEffect(() => {
    if (modulesLoaded && modules.length > 0 && !activeModule) {
      const params = new URLSearchParams(location.search)
      const moduleParam = params.get('module')
      const fromLink = moduleParam && modules.find((m: any) => m.id === moduleParam)
      if (fromLink) { setActiveModule(fromLink.id); return }
      const active = modules.find((m: any) => m.status === 'active')
      setActiveModule(active ? active.id : modules[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesLoaded, modules])

  useEffect(() => {
    if (activeModule) fetchQuestionsForModule(activeModule)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule])

  useEffect(() => {
    if (location.state?.retryQuestions?.length) {
      startRetryQuiz(location.state.retryQuestions)
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  useEffect(() => {
    if (lessonFilter && !quizMode && questions.length > 0) {
      const lessonQs = questions.filter(q => q.lesson_id === lessonFilter)
      startRetryQuiz(lessonQs)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonFilter, questions])

  useEffect(() => {
    if (subjectFilter && !lessonFilter && !quizMode && questions.length > 0) {
      const subjectQs = questions.filter(q => q.subject_id === subjectFilter)
      startRetryQuiz(subjectQs)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter, lessonFilter, questions])

  useEffect(() => {
    if (quizMode) return
    let cancelled = false
    loadSavedActiveExam(user).then(saved => { if (!cancelled) setResumeData(saved) })
    return () => { cancelled = true }
  }, [user, quizMode])

  useEffect(() => {
    if (!quizMode || submitted || quizMode === 'retry') return
    persistActiveExam(user, {
      activeModule, quizMode, quizQuestions, answers, startedAt: quizStartedAtRef.current
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizMode, quizQuestions, answers, submitted])

  useEffect(() => {
    if (quizMode === 'mock' && !submitted && !grading && timeLeft === 0 && quizQuestions.length > 0) {
      clearInterval(timerRef.current)
      submitQuiz()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  useEffect(() => {
    fetchModuleStages(activeModule).then(setStages)
  }, [activeModule])

  // Keyboard shortcuts, desktop only in practice (touch devices don't
  // fire keydown for taps) — plain number keys rather than a modifier
  // combo like ExamSoft's Ctrl/Cmd+Shift+Letter, since this page has
  // no text inputs to conflict with. Ignored while grading/submitted,
  // and skips re-selecting once Tutor Mode has already revealed an
  // answer for the current question.
  useEffect(() => {
    if (!quizMode || submitted || grading) return
    function handleKeyDown(e: KeyboardEvent) {
      const targetTag = (e.target as HTMLElement)?.tagName
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return
      const total = quizQuestions.length
      if (total === 0) return
      const safeIdx = Math.min(currentIndex, total - 1)
      const q = quizQuestions[safeIdx]
      if (!q) return
      const alreadyRevealed = (quizMode === 'practice' || quizMode === 'retry') && !!results[q.id]
      const key = e.key.toLowerCase()

      if (key === 'arrowleft') {
        e.preventDefault()
        setCurrentIndex(i => Math.max(0, i - 1))
      } else if (key === 'arrowright') {
        e.preventDefault()
        setCurrentIndex(i => Math.min(total - 1, i + 1))
      } else if (['1', '2', '3', '4'].includes(key) && !alreadyRevealed) {
        e.preventDefault()
        selectAnswer(safeIdx, optionLabels[Number(key) - 1])
      } else if (key === 'f') {
        e.preventDefault()
        toggleFlagFor(q)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [quizMode, submitted, grading, currentIndex, quizQuestions, results])

  async function fetchSubjects() {
    const { data, error } = await supabase.from('subjects').select('*').order('name')
    if (error) {
      const cached = localStorage.getItem('mcq_subjects_cache')
      if (cached) setSubjects(JSON.parse(cached))
      else setLoadError(true)
    } else if (data) {
      setSubjects(data)
      localStorage.setItem('mcq_subjects_cache', JSON.stringify(data))
    }
  }

  async function fetchLessons() {
    const { data, error } = await supabase.from('lessons').select('id, title, subject_id')
    if (error) {
      const cached = localStorage.getItem('mcq_lessons_cache')
      if (cached) setLessons(JSON.parse(cached))
    } else if (data) {
      setLessons(data)
      localStorage.setItem('mcq_lessons_cache', JSON.stringify(data))
    }
  }

  async function fetchQuestionsForModule(moduleId: string) {
    const cacheKey = `mcq_questions_cache_${moduleId}`
    const cached = localStorage.getItem(cacheKey)
    let hadCache = false
    if (cached) {
      try {
        setQuestions(JSON.parse(cached))
        setUsingCache(true)
        hadCache = true
      } catch { /* ignore corrupt cache */ }
    }
    setLoading(!hadCache)

    const { data, error } = await supabase
      .from('questions')
      .select('id, question, option_a, option_b, option_c, option_d, exam_type, exam_stage, module_id, subject_id, lesson_id, source, created_at')
      .eq('module_id', moduleId)
      .order('created_at')

    if (error) {
      if (!hadCache) setLoadError(true)
    } else if (data) {
      setQuestions(data)
      setUsingCache(false)
      localStorage.setItem(cacheKey, JSON.stringify(data))
    }
    setLoading(false)
  }

  async function fetchAnsweredIds() {
    const { data } = await supabase.from('answered_questions').select('question_id').eq('user_id', user.id)
    if (data) setAnsweredIds(new Set(data.map((d: any) => d.question_id)))
  }

  const moduleSubjects = subjects.filter(s => s.module_id === activeModule)
  const activeModuleObj = modules.find((m: any) => m.id === activeModule)

  const getFilteredQuestions = (type: string) => {
    return questions.filter(q => {
      const modMatch = q.module_id === activeModule
      const typeMatch = type === 'mock'
        ? q.exam_type === 'mock' || q.exam_type === 'both'
        : q.exam_type === 'practice' || q.exam_type === 'both'
      const subMatch = activeSubject === 'all' || q.subject_id === activeSubject
      const stageMatch = activeStage === 'all' || (q.exam_stage || 'general') === activeStage
      return modMatch && typeMatch && subMatch && stageMatch
    })
  }

  function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }

  async function loadFlagsFor(ids: string[]) {
    if (ids.length === 0) return new Set<string>()
    if (user) {
      const { data } = await supabase.from('flagged_questions').select('question_id').eq('user_id', user.id).in('question_id', ids)
      return new Set<string>((data || []).map((r: any) => r.question_id))
    }
    const flags = getGuestFlags()
    return new Set<string>(flags.filter((f: any) => ids.includes(f.question_id)).map((f: any) => f.question_id))
  }

  async function toggleFlagFor(q: any) {
    if (!q) return
    const isFlagged = flaggedIds.has(q.id)
    const next = new Set(flaggedIds)
    if (isFlagged) {
      next.delete(q.id)
      if (user) await supabase.from('flagged_questions').delete().eq('user_id', user.id).eq('question_id', q.id)
      else toggleGuestFlag({ question_id: q.id })
      showToast('Flag removed')
    } else {
      next.add(q.id)
      if (user) {
        await supabase.from('flagged_questions').insert({ user_id: user.id, question_id: q.id, module_id: q.module_id })
      } else {
        toggleGuestFlag({
          question_id: q.id, question: q.question,
          option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
          module_id: q.module_id, source: q.source
        })
      }
      showToast('🚩 Question flagged')
    }
    setFlaggedIds(next)
  }

  // Unified exam timer — counts down for mock (urgency escalates as it
  // runs low), counts up for practice/retry (so a timer is always
  // visible during an exam). Always clears any previous interval
  // first, since "Try Again" can start a fresh quiz before the old
  // one's own timer has stopped.
  function startTimer(startedAt: number, mode: string) {
    clearInterval(timerRef.current)
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      if (mode === 'mock') setTimeLeft(Math.max(0, MOCK_MINUTES * 60 - elapsed))
      else setElapsedSeconds(elapsed)
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
  }

  // AUDIT FIX (per user request): if the current selection has zero
  // eligible questions, don't let the student enter an empty exam
  // screen at all — show a toast and stay on the browsing view.
  function startQuiz(type: string, subjectId: string | null = null) {
    let qs = type === 'mock'
      ? shuffle(getFilteredQuestions('mock')).slice(0, 36)
      : shuffle(questions.filter(q =>
          q.subject_id === subjectId &&
          (q.exam_type === 'practice' || q.exam_type === 'both') &&
          (activeStage === 'all' || (q.exam_stage || 'general') === activeStage)
        )).slice(0, 50)

    if (qs.length === 0) {
      showToast('❌ No questions available for this selection yet', 'error')
      return
    }

    setQuizQuestions(qs)
    setAnswers({})
    setResults({})
    setSubmitted(false)
    setQuizMode(type)
    setResumeData(null)
    setCurrentIndex(0)
    setElapsedSeconds(0)
    setShowReview(false)
    setStruckOut({})
    loadFlagsFor(qs.map(q => q.id)).then(setFlaggedIds)

    quizStartedAtRef.current = Date.now()
    startTimer(quizStartedAtRef.current, type)
    // Entering exam mode should start from a known position — the mini
    // status header assumes it's sitting near the top of the gradient.
    window.scrollTo({ top: 0 })
  }

  // Same guard as startQuiz above — a retry list can legitimately be
  // empty (e.g. every flagged/incorrect question for a filter has
  // since been deleted), so this is checked here too rather than only
  // at the two call sites that already guard it themselves.
  function startRetryQuiz(list: any[]) {
    if (!list || list.length === 0) {
      showToast('❌ No questions to retry', 'error')
      return
    }

    setQuizQuestions(list)
    setAnswers({})
    setResults({})
    setSubmitted(false)
    setQuizMode('retry')
    setResumeData(null)
    setCurrentIndex(0)
    setElapsedSeconds(0)
    setShowReview(false)
    setStruckOut({})
    quizStartedAtRef.current = Date.now()
    startTimer(quizStartedAtRef.current, 'retry')
    loadFlagsFor(list.map(q => q.id)).then(setFlaggedIds)
    window.scrollTo({ top: 0 })
  }

  async function resumeExam() {
    if (!resumeData) return
    setActiveModule(resumeData.activeModule)
    setQuizQuestions(resumeData.quizQuestions || [])
    setAnswers(resumeData.answers || {})
    setResults({})
    setSubmitted(false)
    setQuizMode(resumeData.quizMode)
    setCurrentIndex(0)
    setShowReview(false)
    setStruckOut({})
    quizStartedAtRef.current = resumeData.startedAt
    loadFlagsFor((resumeData.quizQuestions || []).map((q: any) => q.id)).then(setFlaggedIds)

    startTimer(resumeData.startedAt, resumeData.quizMode)
    setResumeData(null)
    window.scrollTo({ top: 0 })
  }

  async function discardResume() {
    await clearActiveExam(user)
    setResumeData(null)
  }

  function stopQuiz() {
    clearInterval(timerRef.current)
    setQuizMode(null)
    setQuizQuestions([])
    setAnswers({})
    setResults({})
    setSubmitted(false)
    setTimeLeft(0)
    setElapsedSeconds(0)
    setFlaggedIds(new Set())
    setCurrentIndex(0)
    setShowReview(false)
    setStruckOut({})
  }

  // Tutor Mode: practice and retry quizzes reveal correct/incorrect +
  // explanation the instant a question is answered (matches how every
  // major board-exam question bank — UWorld, TrueLearn, BoardVitals —
  // splits "tutor" from "timed" mode). Mock Exam stays strictly
  // deferred until submission, since it's meant to simulate real test
  // conditions.
  //
  // Note: this per-question, in-the-moment grading still goes through
  // grade_mcq (unchanged) — that RPC is only ever used for immediate
  // feedback while a quiz is in progress, never for the recorded score.
  // The recorded score/points/history for signed-in users now come
  // exclusively from submit_quiz_attempt (see submitQuiz below), which
  // re-grades everything itself server-side rather than trusting
  // whatever the client already showed on screen.
  const isTutorMode = quizMode === 'practice' || quizMode === 'retry'

  async function tutorGradeAnswer(qi: number, opt: string) {
    const q = quizQuestions[qi]
    if (!q) return
    const { data, error } = await supabase.rpc('grade_mcq', { p_answers: [{ id: q.id, answer: opt }] })
    if (!error && data && data[0]) {
      const r = data[0]
      setResults(prev => ({
        ...prev,
        [q.id]: { is_correct: r.is_correct, correct_answer: r.correct_answer, explanation: r.explanation }
      }))
    } else {
      showToast('⚠️ Could not grade that answer — check your connection and try again', 'error')
    }
  }

  function selectAnswer(qi: number, opt: string) {
    if (submitted) return
    const q = quizQuestions[qi]
    if (isTutorMode && q && results[q.id]) return
    setAnswers(prev => ({ ...prev, [qi]: opt }))
    if (isTutorMode) tutorGradeAnswer(qi, opt)
  }

  function toggleStrike(qi: number, label: string) {
    setStruckOut(prev => {
      const next = { ...prev }
      const set = new Set(next[qi] || [])
      if (set.has(label)) set.delete(label)
      else set.add(label)
      next[qi] = set
      return next
    })
  }

  function goPrev() { setCurrentIndex(i => Math.max(0, i - 1)) }
  function goNext() { setCurrentIndex(i => Math.min(quizQuestions.length - 1, i + 1)) }

  function tryAgain() {
    if (quizMode === 'retry') startRetryQuiz(quizQuestions)
    else startQuiz(quizMode!)
  }

  function startTargetedPractice(subjectId: string) {
    const incorrectQs = quizQuestions
      .filter(q => q.subject_id === subjectId && results[q.id] && !results[q.id].is_correct)
      .map(q => ({
        id: q.id, question: q.question,
        option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
        module_id: q.module_id, subject_id: q.subject_id
      }))
    if (incorrectQs.length === 0) return
    startRetryQuiz(incorrectQs)
  }

  // AUDIT FIX (score-integrity, pre-launch security audit):
  //
  // This function used to (1) call grade_mcq for every question,
  // (2) compute total/correct/score/points itself in the browser from
  // that response, and then (3) write answered_questions, exam_history,
  // and a points amount directly to the database via plain table
  // calls + `award_points({ p_amount: newPoints })`. Since every one of
  // those writes only ever checked `auth.uid() = user_id` at the
  // database layer (not whether the score/points being written were
  // ever actually earned), a signed-in user could skip taking a quiz
  // entirely and insert an arbitrary score/points combination directly
  // from the browser console, using nothing but their own already-
  // authenticated session and the public anon key.
  //
  // For signed-in users, all of that now happens in ONE atomic,
  // server-side call: submit_quiz_attempt(). The RPC re-grades every
  // submitted answer itself against the real answer key, and is the
  // only thing that writes answered_questions/exam_history/points —
  // the client never sends a score, a correctness flag, or a points
  // amount for a signed-in user again. See the accompanying SQL
  // migration for the RPC definition.
  //
  // Guests (no account) are unaffected: nothing is persisted server-
  // side for them regardless, so grade_mcq + local (per-device)
  // bookkeeping — exactly as before — is still the right, lowest-risk
  // path for that case.
  async function submitQuiz() {
    clearInterval(timerRef.current)
    setGrading(true)

    const payload = quizQuestions.map((q, i) => ({ id: q.id, answer: answers[i] || null }))
    const total = quizQuestions.length
    const timeSec = quizMode === 'mock' ? Math.max(0, MOCK_MINUTES * 60 - timeLeft) : null

    const retryModuleIsUniform = quizMode === 'retry' && quizQuestions.every(q => q.module_id === quizQuestions[0]?.module_id)
    const retrySubjectIsUniform = quizMode === 'retry' && quizQuestions.every(q => q.subject_id === quizQuestions[0]?.subject_id)
    const historyModuleId = quizMode === 'retry'
      ? (retryModuleIsUniform ? (quizQuestions[0]?.module_id || null) : null)
      : activeModule
    const historySubjectId = quizMode === 'practice'
      ? (quizQuestions[0]?.subject_id || null)
      : quizMode === 'retry'
        ? (retrySubjectIsUniform ? (quizQuestions[0]?.subject_id || null) : null)
        : null

    const resultMap: Record<string, any> = {}

    if (user) {
      // Signed-in path — server is authoritative for grading, scoring,
      // points, and the exam_history record. See comment above.
      const { data: graded, error } = await supabase.rpc('submit_quiz_attempt', {
        p_answers: payload,
        p_module_id: historyModuleId,
        p_quiz_type: quizMode,
        p_subject_id: historySubjectId,
        p_time_sec: timeSec
      })

      if (error) {
        setGrading(false)
        showToast('⚠️ Could not submit — check your connection and try again', 'error')
        return
      }

      if (graded) {
        graded.forEach((r: any) => {
          resultMap[r.question_id] = {
            is_correct: r.is_correct,
            correct_answer: r.correct_answer,
            explanation: r.explanation
          }
        })
      }

      // The RPC already recorded everything server-side — refresh the
      // locally-cached profile/answered-ids state to reflect it rather
      // than re-deriving anything from the client's own computation.
      fetchProfile(user.id)
      fetchAnsweredIds()
    } else {
      // Guest path — unchanged. Nothing is persisted server-side for a
      // guest regardless of what the client sends, so there's no
      // integrity gap here to close; grade_mcq + local bookkeeping is
      // still the correct, lowest-risk approach.
      const { data: graded, error } = await supabase.rpc('grade_mcq', { p_answers: payload })

      if (error) {
        setGrading(false)
        showToast('⚠️ Could not submit — check your connection and try again', 'error')
        return
      }

      if (graded) {
        graded.forEach((r: any) => {
          resultMap[r.question_id] = {
            is_correct: r.is_correct,
            correct_answer: r.correct_answer,
            explanation: r.explanation
          }
        })
      }

      const incorrectSnapshots = quizQuestions
        .filter(q => resultMap[q.id] && !resultMap[q.id].is_correct)
        .map(q => ({
          question_id: q.id,
          question: q.question,
          option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
          correct_answer: resultMap[q.id].correct_answer,
          explanation: resultMap[q.id].explanation,
          module_id: q.module_id || null,
          subject_id: q.subject_id || null,
          source: q.source || null,
        }))

      const guestCorrectCount = quizQuestions.filter(q => resultMap[q.id]?.is_correct).length
      const guestScorePercent = total > 0 ? Math.round((guestCorrectCount / total) * 100) : 0

      quizQuestions.forEach(q => {
        const r = resultMap[q.id]
        if (r && !r.is_correct) {
          saveGuestIncorrect({
            question_id: q.id, question: q.question,
            option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
            module_id: q.module_id, source: q.source, correct_answer: r.correct_answer, explanation: r.explanation
          })
        }
      })
      enrichGuestFlagsWithResults(resultMap)
      addGuestHistory({
        module_id: historyModuleId, quiz_type: quizMode,
        total, correct: guestCorrectCount, score: guestScorePercent, time_sec: timeSec,
        incorrect_questions: incorrectSnapshots
      })
    }

    setResults(resultMap)
    setGrading(false)
    setSubmitted(true)
    window.scrollTo({ top: 0 })

    clearActiveExam(user)

    setFinishTimeSec(quizMode === 'mock' ? (timeSec as number) : elapsedSeconds)
  }

  // ── Exam mode (taking + results) ────────────────────────────────────
  if (quizMode) {
    return (
      <MCQExamFlow
        dark={dark}
        quizMode={quizMode}
        submitted={submitted}
        grading={grading}
        quizQuestions={quizQuestions}
        answers={answers}
        results={results}
        