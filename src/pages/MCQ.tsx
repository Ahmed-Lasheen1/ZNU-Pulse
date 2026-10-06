// src/pages/MCQ.tsx
import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useAuth, useModules } from '../contexts'
import { useToast } from '../components/ToastProvider'
import { fetchModuleStages } from '../lib/moduleStages'
import { fetchLessonStageMap, inStage } from '../lib/lessonStages'
import { getGuestFlags, toggleGuestFlag, enrichGuestFlagsWithResults, addGuestHistory } from '../lib/reviewStorage'
import { loadSavedActiveExam, persistActiveExam, clearActiveExam } from '../lib/activeExam'
import { fetchAllRows } from '../lib/fetchAllRows'
import { storageGet, storageSet } from '../lib/safeStorage'
import { fetchSimulatorConfig, drawSimulator, shuffle } from '../lib/stageSimulator'
import { optionLabels } from './mcq/mcqShared'
import MCQBrowse from './mcq/MCQBrowse'
import MCQExamFlow from './mcq/MCQExamFlow'

interface QuizConfig {
  type: string
  subjectId: string | null
  lessonId: string | null
  sourceFilter: string | null
  simulatorStage?: string | null
}

export default function MCQ({ dark }: { dark: boolean }) {
  const { user, fetchProfile } = useAuth() as any
  const { modules, modulesLoaded, modulesError } = useModules() as any
  const location = useLocation()
  const navigate = useNavigate()
  const showToast = useToast() as (message: string, type?: 'success' | 'error') => void

  const [subjects, setSubjects] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [simRows, setSimRows] = useState<any[]>([])
  const [simLoaded, setSimLoaded] = useState(false)
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [activeStage, setActiveStage] = useState(() => {
    const params = new URLSearchParams(location.search)
    return params.get('stage') || 'all'
  })
  const [activeSubject, setActiveSubject] = useState('all')
  const [stages, setStages] = useState<any[]>([])
  const [lessonStageMap, setLessonStageMap] = useState<Record<string, string[]>>({})
  const [lessonStageMapLoaded, setLessonStageMapLoaded] = useState(false)
  const [lessonFilter] = useState(() => new URLSearchParams(location.search).get('lesson') || null)
  const [subjectFilter] = useState(() => new URLSearchParams(location.search).get('subject') || null)
  const [simulatorParam] = useState(() => new URLSearchParams(location.search).get('simulator') === '1')
  const [quizMode, setQuizMode] = useState<string | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [grading, setGrading] = useState(false)
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [finishTimeSec, setFinishTimeSec] = useState(0)
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set())
  const [resumeData, setResumeData] = useState<any>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [struckOut, setStruckOut] = useState<Record<number, Set<string>>>({})

  const FONT_SCALES = [0.9, 1, 1.15, 1.3]
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = storageGet('znu_mcq_font_scale')
    const parsed = saved ? parseFloat(saved) : 1
    return FONT_SCALES.includes(parsed) ? parsed : 1
  })
  useEffect(() => { storageSet('znu_mcq_font_scale', String(fontScale)) }, [fontScale])
  function cycleFontScale() {
    setFontScale(prev => FONT_SCALES[(FONT_SCALES.indexOf(prev) + 1) % FONT_SCALES.length])
  }

  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const quizStartedAtRef = useRef<number | null>(null)
  const lastQuizConfigRef = useRef<QuizConfig | null>(null)
  const [usingCache, setUsingCache] = useState(false)
  const gradingInFlightRef = useRef<Set<number>>(new Set())
  const sessionIdRef = useRef(0)
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const pendingPersistRef = useRef<any>(null)
  const submittingRef = useRef(false)
  const autoStartedLessonRef = useRef(false)
  const autoStartedSubjectRef = useRef(false)
  const autoStartedSimulatorRef = useRef(false)
  const isMountedRef = useRef(true)
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // Drops lesson/subject from the URL once they've auto-started a quiz, so Back
  // from another page lands on the browse screen instead of restarting it.
  function clearAutoStartParams() {
    const params = new URLSearchParams(location.search)
    params.delete('lesson')
    params.delete('subject')
    params.delete('simulator')
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
  }

  useEffect(() => {
    let ignore = false
    fetchLessonStageMap().then(({ map }) => {
      if (ignore) return
      setLessonStageMap(map)
      setLessonStageMapLoaded(true)
    })
    return () => { ignore = true }
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

  // Drops caches of deleted modules — only once the modules fetch succeeded.
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
    if (!activeModule) return
    let ignore = false
    setSimRows([])
    setSimLoaded(false)
    fetchSimulatorConfig(activeModule).then(({ rows }) => {
      if (ignore) return
      setSimRows(rows)
      setSimLoaded(true)
    })
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
      clearAutoStartParams()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonFilter, questions])

  useEffect(() => {
    if (subjectFilter && !lessonFilter && !quizMode && questions.length > 0 && !autoStartedSubjectRef.current) {
      autoStartedSubjectRef.current = true
      const subjectQs = questions.filter(q => q.subject_id === subjectFilter)
      startRetryQuiz(subjectQs)
      clearAutoStartParams()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter, lessonFilter, questions])

  useEffect(() => {
    if (!simulatorParam || autoStartedSimulatorRef.current || quizMode) return
    if (!activeModule || !simLoaded || !lessonStageMapLoaded || activeStage === 'all') return
    if (!questions.some(q => q.module_id === activeModule)) return
    autoStartedSimulatorRef.current = true
    startSimulator(activeStage)
    clearAutoStartParams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulatorParam, quizMode, activeModule, activeStage, simLoaded, lessonStageMapLoaded, questions])

  useEffect(() => {
    if (quizMode) return
    let cancelled = false
    loadSavedActiveExam(user).then(saved => { if (!cancelled) setResumeData(saved) })
    return () => { cancelled = true }
  }, [user, quizMode])

  // Debounced save of the in-progress exam; the pending snapshot lives in a
  // ref so a real unmount can flush it.
  useEffect(() => {
    if (!quizMode || submitted || quizMode === 'retry') { pendingPersistRef.current = null; return }
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
    const payload = {
      activeModule, quizMode, quizQuestions, answers,
      startedAt: quizStartedAtRef.current,
      quizConfig: lastQuizConfigRef.current
    }
    pendingPersistRef.current = payload
    persistTimeoutRef.current = setTimeout(() => {
      persistActiveExam(user, { ...payload, savedAt: Date.now() })
      pendingPersistRef.current = null
    }, 1500)
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizMode, quizQuestions, answers, submitted])

  useEffect(() => {
    return () => {
      if (pendingPersistRef.current) persistActiveExam(userRef.current, { ...pendingPersistRef.current, savedAt: Date.now() })
    }
  }, [])

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
  }, [quizMode, submitted, grading, currentIndex, quizQuestions, results, flaggedIds])

  async function fetchSubjects() {
    const { data, error } = await supabase.from('subjects').select('*').order('name')
    if (error) {
      try {
        const cached = storageGet('mcq_subjects_cache')
        if (cached) setSubjects(JSON.parse(cached))
        else setLoadError(true)
      } catch { setLoadError(true) }
    } else if (data) {
      setSubjects(data)
      storageSet('mcq_subjects_cache', JSON.stringify(data))
    }
  }

  async function fetchLessons() {
    const { data, error } = await supabase.from('lessons').select('id, title, subject_id')
    if (error) {
      try {
        const cached = storageGet('mcq_lessons_cache')
        if (cached) setLessons(JSON.parse(cached))
      } catch { /* ignore corrupt cache */ }
    } else if (data) {
      setLessons(data)
      storageSet('mcq_lessons_cache', JSON.stringify(data))
    }
  }

  async function fetchQuestionsForModule(moduleId: string, isIgnored: () => boolean = () => false) {
    const cacheKey = `mcq_questions_cache_${moduleId}`
    const cached = storageGet(cacheKey)
    let hadCache = false
    if (cached) {
      try {
        if (!isIgnored()) {
          setQuestions(JSON.parse(cached))
          setUsingCache(false)
        }
        hadCache = true
      } catch { /* ignore corrupt cache */ }
    }
    if (!isIgnored()) setLoading(!hadCache)

    const { data, error } = await fetchAllRows(() => supabase
      .from('questions_public')
      .select('id, question, option_a, option_b, option_c, option_d, exam_type, exam_stage, module_id, subject_id, lesson_id, source, created_at')
      .eq('module_id', moduleId)
      .order('created_at')
      .order('id'))

    if (isIgnored()) return

    if (error) {
      if (hadCache) setUsingCache(true)
      else setLoadError(true)
    } else if (data) {
      setQuestions(data)
      setUsingCache(false)
      storageSet(cacheKey, JSON.stringify(data))
    }
    setLoading(false)
  }

  const moduleSubjects = subjects.filter(s => s.module_id === activeModule)
  const activeModuleObj = modules.find((m: any) => m.id === activeModule)

  // `sourceOnly` narrows to one question source (Mock Exam's "University Doctors Only").
  const getFilteredQuestions = (type: string, sourceOnly: string | null = null) => {
    return questions.filter(q => {
      const modMatch = q.module_id === activeModule
      const typeMatch = type === 'mock'
        ? q.exam_type === 'mock' || q.exam_type === 'both'
        : q.exam_type === 'practice' || q.exam_type === 'both'
      const subMatch = activeSubject === 'all' || q.subject_id === activeSubject
      const stageMatch = inStage(q, activeStage, lessonStageMap)
      const sourceMatch = !sourceOnly || q.source === sourceOnly
      return modMatch && typeMatch && subMatch && stageMatch && sourceMatch
    })
  }

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
        const { error } = await supabase.from('flagged_questions').upsert(
          { user_id: user.id, question_id: q.id, module_id: q.module_id },
          { onConflict: 'user_id,question_id', ignoreDuplicates: true }
        )
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

  // Stopwatch counting up from quiz start — no limit, no auto-submit.
  function startTimer(startedAt: number) {
    clearInterval(timerRef.current)
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    tick()
    timerRef.current = setInterval(tick, 1000)
  }

  function beginQuiz(qs: any[], type: string, config: QuizConfig) {
    lastQuizConfigRef.current = config

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
    const flagSession = sessionIdRef.current
    loadFlagsFor(qs.map(q => q.id)).then(ids => {
      if (sessionIdRef.current === flagSession) setFlaggedIds(ids)
    })

    quizStartedAtRef.current = Date.now()
    startTimer(quizStartedAtRef.current)
    window.scrollTo({ top: 0 })
  }

  // `lessonId` wins over `subjectId`; `sourceFilter` is currently only 'university'.
  function startQuiz(type: string, subjectId: string | null = null, lessonId: string | null = null, sourceFilter: string | null = null) {
    const qs = type === 'mock'
      ? shuffle(getFilteredQuestions('mock', sourceFilter))
      : shuffle(questions.filter(q =>
          (lessonId ? q.lesson_id === lessonId : q.subject_id === subjectId) &&
          (q.exam_type === 'practice' || q.exam_type === 'both') &&
          inStage(q, activeStage, lessonStageMap) &&
          (!sourceFilter || q.source === sourceFilter)
        ))

    if (qs.length === 0) {
      showToast('❌ No questions available for this selection yet', 'error')
      return
    }

    beginQuiz(qs, type, { type, subjectId, lessonId, sourceFilter, simulatorStage: null })
  }

  // Draws a fresh random set per the admin's per-subject counts for this stage.
  function startSimulator(stage: string) {
    const rows = simRows.filter(r => r.stage === stage)
    const qs = drawSimulator(questions, rows, stage, lessonStageMap)
    if (qs.length === 0) {
      showToast('❌ No simulator questions available for this stage yet', 'error')
      return
    }
    beginQuiz(qs, 'mock', { type: 'mock', subjectId: null, lessonId: null, sourceFilter: null, simulatorStage: stage })
  }

  function startRetryQuiz(list: any[]) {
    if (!list || list.length === 0) {
      showToast('❌ No questions to retry', 'error')
      return
    }

    lastQuizConfigRef.current = null

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
    startTimer(quizStartedAtRef.current)
    const flagSession = sessionIdRef.current
    loadFlagsFor(list.map(q => q.id)).then(ids => {
      if (sessionIdRef.current === flagSession) setFlaggedIds(ids)
    })
    window.scrollTo({ top: 0 })
  }

  async function resumeExam() {
    if (!resumeData) return
    // Time spent away isn't counted: rebuild the start from elapsed-at-last-save.
    const startedAt = resumeData.savedAt && resumeData.startedAt
      ? Date.now() - (resumeData.savedAt - resumeData.startedAt)
      : resumeData.startedAt
    lastQuizConfigRef.current = resumeData.quizConfig || null
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
    quizStartedAtRef.current = startedAt
    const flagSession = sessionIdRef.current
    loadFlagsFor((resumeData.quizQuestions || []).map((q: any) => q.id)).then(ids => {
      if (sessionIdRef.current === flagSession) setFlaggedIds(ids)
    })

    startTimer(startedAt)
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
    if (quizMode === 'retry') { startRetryQuiz(quizQuestions); return }
    const config = lastQuizConfigRef.current
    if (config?.simulatorStage) { startSimulator(config.simulatorStage); return }
    if (config) startQuiz(config.type, config.subjectId, config.lessonId, config.sourceFilter)
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
    const timeSec = null

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

    setFinishTimeSec(elapsedSeconds)
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
      lessons={lessons}
      lessonStageMap={lessonStageMap}
      simulatorRows={simRows}
      simulatorLoading={!simLoaded}
      getFilteredQuestions={getFilteredQuestions}
      onStartQuiz={startQuiz}
      onStartSimulator={startSimulator}
    />
  )
}
