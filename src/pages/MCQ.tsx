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

  // Adjustable question text size, persisted like the theme preference.
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
  const gradingInFlightRef = useRef<Set<number>>(new Set())
  // BUG FIX (perf): debounces the paused-exam autosave. This effect
  // used to call persistActiveExam() — a Supabase write for signed-in
  // users — on every single answer/navigation change, which meant up
  // to ~36 writes during one mock exam. Debouncing to fire 1.5s after
  // the last change cuts that dramatically with no visible behavior
  // change: stopQuiz()/submitQuiz() already call clearActiveExam()
  // directly on real exit paths, so this timer only ever governs the
  // "resume where you left off" snapshot while a student is actively
  // answering.
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // ── Initial data load ──────────────────────────────────────────────
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

  // BUG FIX: fetchQuestionsForModule previously had no cancellation
  // guard, unlike every other data-fetching effect in this app
  // (StagePage, SubjectPage, ModulePage, FilesPage, LessonPage all use
  // an `ignore` flag). If a student tapped between module tabs
  // quickly, an older in-flight request for module A could resolve
  // AFTER a newer request for module B and overwrite `questions` with
  // the wrong module's data. `isIgnored()` is threaded through so any
  // state update from a stale request is skipped.
  useEffect(() => {
    if (!activeModule) return
    let ignore = false
    fetchQuestionsForModule(activeModule, () => ignore)
    return () => { ignore = true }
  }, [activeModule])

  // ── Deep-link entry points (retry / lesson / subject) ──────────────
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

  // ── Paused-exam persistence ─────────────────────────────────────────
  useEffect(() => {
    if (quizMode) return
    let cancelled = false
    loadSavedActiveExam(user).then(saved => { if (!cancelled) setResumeData(saved) })
    return () => { cancelled = true }
  }, [user, quizMode])

    useEffect(() => {
    if (!quizMode || submitted || quizMode === 'retry') return
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
    persistTimeoutRef.current = setTimeout(() => {
      persistActiveExam(user, {
        activeModule, quizMode, quizQuestions, answers, startedAt: quizStartedAtRef.current
      })
    }, 1500)
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizMode, quizQuestions, answers, submitted])

  useEffect(() => {
    if (quizMode === 'mock' && !submitted && !grading && timeLeft === 0 && quizQuestions.length > 0) {
      clearInterval(timerRef.current)
      submitQuiz()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  // BUG FIX: previously had no cancellation guard. Switching modules
  // quickly could let an older fetchModuleStages(A) resolve after a
  // newer fetchModuleStages(B) and leave the stage tabs showing the
  // wrong module's stages. Mirrors the ignore-guard already used a
  // few effects above for fetchQuestionsForModule.
  useEffect(() => {
    let ignore = false
    fetchModuleStages(activeModule).then(result => { if (!ignore) setStages(result) })
    return () => { ignore = true }
  }, [activeModule])

  // ── Keyboard shortcuts (desktop only — touch devices don't fire keydown) ──
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

  // ── Data fetching ────────────────────────────────────────────────────
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

  // Answer key columns are excluded here — questions_public strips
  // correct/explanation so a guest can never read them client-side.
  //
  // BUG FIX: accepts an optional isIgnored() check (defaults to
  // "never ignored" so any other caller keeps working unchanged).
  // The effect above supplies a real one, so a state update from a
  // request for a module the student has already navigated away from
  // is skipped instead of clobbering the newer module's data.
  async function fetchQuestionsForModule(moduleId: string, isIgnored: () => boolean = () => false) {
    const cacheKey = `mcq_questions_cache_${moduleId}`
    const cached = localStorage.getItem(cacheKey)
    let hadCache = false
    if (cached) {
      try {
        if (!isIgnored()) {
          setQuestions(JSON.parse(cached))
          setUsingCache(true)
        }
        hadCache = true
      } catch { /* ignore corrupt cache */ }
    }
    if (!isIgnored()) setLoading(!hadCache)

    const { data, error } = await supabase
      .from('questions_public')
      .select('id, question, option_a, option_b, option_c, option_d, exam_type, exam_stage, module_id, subject_id, lesson_id, source, created_at')
      .eq('module_id', moduleId)
      .order('created_at')

    if (isIgnored()) return

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

  // ── Flags ────────────────────────────────────────────────────────────
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

  // ── Timer ────────────────────────────────────────────────────────────
  // Counts down for mock exams, counts up for practice/retry.
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

  // ── Starting a quiz ──────────────────────────────────────────────────
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
    gradingInFlightRef.current.clear()
    loadFlagsFor(qs.map(q => q.id)).then(setFlaggedIds)

    quizStartedAtRef.current = Date.now()
    startTimer(quizStartedAtRef.current, type)
    window.scrollTo({ top: 0 })
  }

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
    gradingInFlightRef.current.clear()
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
    gradingInFlightRef.current.clear()
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
    gradingInFlightRef.current.clear()
  }

  // ── Tutor Mode grading ───────────────────────────────────────────────
  // Practice/retry reveal correct/incorrect + explanation immediately.
  // This per-question feedback still goes through grade_mcq (unchanged);
  // the recorded score/points/history come only from submit_quiz_attempt.
  const isTutorMode = quizMode === 'practice' || quizMode === 'retry'

  async function tutorGradeAnswer(qi: number, opt: string) {
    const q = quizQuestions[qi]
    if (!q) return
    const { data, error } = await supabase.rpc('grade_mcq', { p_answers: [{ id: q.id, answer: opt }] })
    // BUG FIX: release the in-flight lock for this question regardless
    // of success/failure so a genuinely failed grading attempt doesn't
    // permanently block the student from retrying that question.
    gradingInFlightRef.current.delete(qi)
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
    // BUG FIX: while a grading request for this question is already
    // in flight, ignore further taps rather than firing an
    // overlapping second request whose response could land after the
    // first and leave the displayed result out of sync with the
    // currently selected option.
    if (isTutorMode && gradingInFlightRef.current.has(qi)) return
    setAnswers(prev => ({ ...prev, [qi]: opt }))
    if (isTutorMode) {
      gradingInFlightRef.current.add(qi)
      tutorGradeAnswer(qi, opt)
    }
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

  // ── Submitting a quiz ────────────────────────────────────────────────
  // For signed-in users, submit_quiz_attempt() re-grades every answer
  // server-side and is the only thing that writes
  // answered_questions/exam_history/points — the client never sends a
  // score or points amount. This keeps a signed-in student from being
  // able to award themselves an arbitrary score/points from the console.
  // Guests aren't persisted server-side at all, so grade_mcq + local
  // (per-device) bookkeeping is the correct, lowest-risk path for them.
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

      fetchProfile(user.id)
      fetchAnsweredIds()
    } else {
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

  // ── Render: exam mode (taking + results) ────────────────────────────
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
        flaggedIds={flaggedIds}
        struckOut={struckOut}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        timeLeft={timeLeft}
        elapsedSeconds={elapsedSeconds}
        finishTimeSec={finishTimeSec}
        fontScale={fontScale}
        cycleFontScale={cycleFontScale}
        showReview={showReview}
        setShowReview={setShowReview}
        subjects={subjects}
        lessons={lessons}
        lessonFilter={lessonFilter}
        stopQuiz={stopQuiz}
        submitQuiz={submitQuiz}
        tryAgain={tryAgain}
        startTargetedPractice={startTargetedPractice}
        selectAnswer={selectAnswer}
        toggleStrike={toggleStrike}
        toggleFlagFor={toggleFlagFor}
        goPrev={goPrev}
        goNext={goNext}
      />
    )
  }

  // ── Render: module / subject browsing view ──────────────────────────
  return (
    <MCQBrowse
      dark={dark}
      modulesError={modulesError}
      loadError={loadError}
      usingCache={usingCache}
      resumeData={resumeData}
      onResume={resumeExam}
      onDiscardResume={discardResume}
      activeModuleObj={activeModuleObj}
      stages={stages}
      activeStage={activeStage}
      onSelectStage={setActiveStage}
      moduleSubjects={moduleSubjects}
      activeSubject={activeSubject}
      onSelectSubject={setActiveSubject}
      loading={loading}
      questions={questions}
      getFilteredQuestions={getFilteredQuestions}
      onStartQuiz={startQuiz}
    />
  )
}
