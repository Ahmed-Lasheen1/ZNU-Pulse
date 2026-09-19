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
  const sessionIdRef = useRef(0)
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const pendingPersistRef = useRef<any>(null)
  const submittingRef = useRef(false)
  // Guards the auto-start effects below so they fire at most once per
  // mount, even if `questions` refetches later while browsing.
  const autoStartedLessonRef = useRef(false)
  const autoStartedSubjectRef = useRef(false)
  const isMountedRef = useRef(true)
  // BUG FIX: the unmount-flush effect below has an empty dependency
  // array (it must — it should only run once, on real unmount), so a
  // `user` captured directly in its closure would be whatever `user`
  // was at MOUNT time forever. If someone signs in partway through a
  // guest quiz and then navigates away, the flush would persist to
  // Supabase using a stale null `user` instead of the signed-in one
  // (or vice versa). Keeping `user` in a ref that's updated every
  // render means the unmount cleanup always reads the current value.
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    fetchSubjects()
    fetchLessons()
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Drops localStorage question caches for modules that no longer
  // exist (renamed/deleted) — otherwise these grow unbounded.
  //
  // BUG FIX: same class of bug as Checklist.tsx's guest-checklist
  // prune — App.jsx's loadModules() sets modulesLoaded=true even when
  // the modules fetch fails (leaving `modules` empty). Without the
  // modulesError guard, a transient network error would make
  // validIds an empty set and wipe every mcq_questions_cache_* entry,
  // destroying the exact offline fallback (usingCache) this cache
  // exists to provide. Only prune once the fetch is confirmed to have
  // actually succeeded.
  useEffect(() => {
    if (!modulesLoaded || modulesError) return
    try {
      const validIds = new Set(modules.map((m: any) => m.id))
      const prefix = 'mcq_questions_cache_'
      const toRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !key.startsWith(prefix)) continue
        if (!validIds.has(key.slice(prefix.length))) toRemove.push(key)
      }
      toRemove.forEach(k => localStorage.removeItem(k))
    } catch { /* ignore */ }
  }, [modulesLoaded, modulesError, modules])

  useEffect(() => {
    if (!activeModule) return
    let ignore = false
    fetchQuestionsForModule(activeModule, () => ignore)
    return () => { ignore = true }
  }, [activeModule])

  useEffect(() => {
    if (location.state?.retryQuestions?.length) {
      startRetryQuiz(location.state.retryQuestions)
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  useEffect(() => {
    if (lessonFilter && !quizMode && questions.length > 0 && !autoStartedLessonRef.current) {
      autoStartedLessonRef.current = true
      const lessonQs = questions.filter(q => q.lesson_id === lessonFilter)
      startRetryQuiz(lessonQs)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonFilter, questions])

  useEffect(() => {
    if (subjectFilter && !lessonFilter && !quizMode && questions.length > 0 && !autoStartedSubjectRef.current) {
      autoStartedSubjectRef.current = true
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

  // Debounced save of in-progress exam state (for Resume). The
  // pending snapshot is kept in a ref so a real unmount (see the
  // effect below) can flush it instead of silently dropping it.
  useEffect(() => {
    if (!quizMode || submitted || quizMode === 'retry') { pendingPersistRef.current = null; return }
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
    const payload = { activeModule, quizMode, quizQuestions, answers, startedAt: quizStartedAtRef.current }
    pendingPersistRef.current = payload
    persistTimeoutRef.current = setTimeout(() => {
      persistActiveExam(user, payload)
      pendingPersistRef.current = null
    }, 1500)
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizMode, quizQuestions, answers, submitted])

  // Flushes a still-pending save only when MCQ itself unmounts (e.g.
  // navigating away mid-quiz) — not on every dependency change above.
  // Reads userRef.current (not `user` directly) so it always uses the
  // most recent auth state, not whatever `user` was when MCQ mounted.
  useEffect(() => {
    return () => {
      if (pendingPersistRef.current) persistActiveExam(userRef.current, pendingPersistRef.current)
    }
  }, [])

  useEffect(() => {
    if (quizMode === 'mock' && !submitted && !grading && timeLeft === 0 && quizQuestions.length > 0) {
      clearInterval(timerRef.current)
      submitQuiz()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  useEffect(() => {
    let ignore = false
    fetchModuleStages(activeModule).then(result => { if (!ignore) setStages(result) })
    return () => { ignore = true }
  }, [activeModule])

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
      try {
        const cached = localStorage.getItem('mcq_subjects_cache')
        if (cached) setSubjects(JSON.parse(cached))
        else setLoadError(true)
      } catch { setLoadError(true) }
    } else if (data) {
      setSubjects(data)
      localStorage.setItem('mcq_subjects_cache', JSON.stringify(data))
    }
  }

  async function fetchLessons() {
    const { data, error } = await supabase.from('lessons').select('id, title, subject_id')
    if (error) {
      try {
        const cached = localStorage.getItem('mcq_lessons_cache')
        if (cached) setLessons(JSON.parse(cached))
      } catch { /* ignore corrupt cache */ }
    } else if (data) {
      setLessons(data)
      localStorage.setItem('mcq_lessons_cache', JSON.stringify(data))
    }
  }

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
      // Best-effort — a full/quota-exceeded localStorage shouldn't
      // throw and break the (already-succeeded) question fetch above.
      try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch { /* cache write skipped */ }
    }
    setLoading(false)
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

    if (isFlagged) {
      if (user) {
        const { error } = await supabase.from('flagged_questions').delete().eq('user_id', user.id).eq('question_id', q.id)
        if (error) { showToast('❌ Could not remove flag — try again', 'error'); return }
      } else {
        toggleGuestFlag({ question_id: q.id })
      }
      const next = new Set(flaggedIds)
      next.delete(q.id)
      setFlaggedIds(next)
      showToast('Flag removed')
    } else {
      if (user) {
        const { error } = await supabase.from('flagged_questions').insert({ user_id: user.id, question_id: q.id, module_id: q.module_id })
        if (error) { showToast('❌ Could not flag question — try again', 'error'); return }
      } else {
        toggleGuestFlag({
          question_id: q.id, question: q.question,
          option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
          module_id: q.module_id, source: q.source
        })
      }
      const next = new Set(flaggedIds)
      next.add(q.id)
      setFlaggedIds(next)
      showToast('🚩 Question flagged')
    }
  }

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
    sessionIdRef.current++
    // Captured AFTER the increment above, so a flags response that
    // resolves after the user has since started/exited a different
    // quiz session is discarded instead of overwriting its flags.
    const flagSession = sessionIdRef.current
    loadFlagsFor(qs.map(q => q.id)).then(ids => {
      if (sessionIdRef.current === flagSession) setFlaggedIds(ids)
    })

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
    sessionIdRef.current++
    quizStartedAtRef.current = Date.now()
    startTimer(quizStartedAtRef.current, 'retry')
    const flagSession = sessionIdRef.current
    loadFlagsFor(list.map(q => q.id)).then(ids => {
      if (sessionIdRef.current === flagSession) setFlaggedIds(ids)
    })
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
    sessionIdRef.current++
    quizStartedAtRef.current = resumeData.startedAt
    const flagSession = sessionIdRef.current
    loadFlagsFor((resumeData.quizQuestions || []).map((q: any) => q.id)).then(ids => {
      if (sessionIdRef.current === flagSession) setFlaggedIds(ids)
    })

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
    sessionIdRef.current++
  }

  const isTutorMode = quizMode === 'practice' || quizMode === 'retry'

  async function tutorGradeAnswer(qi: number, opt: string) {
    const q = quizQuestions[qi]
    if (!q) return
    const sessionId = sessionIdRef.current
    const { data, error } = await supabase.rpc('grade_mcq', { p_answers: [{ id: q.id, answer: opt }] })
    gradingInFlightRef.current.delete(qi)
    if (!isMountedRef.current || sessionId !== sessionIdRef.current) return
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

  async function submitQuiz() {
    if (submittingRef.current) return
    submittingRef.current = true

    clearInterval(timerRef.current)
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
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

      if (!isMountedRef.current) { submittingRef.current = false; return }

      if (error) {
        setGrading(false)
        showToast('⚠️ Could not submit — check your connection and try again', 'error')
        submittingRef.current = false
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
    } else {
      const { data: graded, error } = await supabase.rpc('grade_mcq', { p_answers: payload })

      if (!isMountedRef.current) { submittingRef.current = false; return }

      if (error) {
        setGrading(false)
        showToast('⚠️ Could not submit — check your connection and try again', 'error')
        submittingRef.current = false
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

    if (!isMountedRef.current) { submittingRef.current = false; return }

    setResults(resultMap)
    setGrading(false)
    setSubmitted(true)
    window.scrollTo({ top: 0 })

    clearActiveExam(user)

    setFinishTimeSec(quizMode === 'mock' ? (timeSec as number) : elapsedSeconds)
    submittingRef.current = false
  }

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
