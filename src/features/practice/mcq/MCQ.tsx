// src/pages/MCQ.tsx
import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/core/supabase'
import { useAuth, useModules } from '@/core/contexts'
import { useToast } from '@/shared/ui/feedback/ToastProvider'
import { fetchModuleStages } from '@/services/content/moduleStages'
import { fetchAllSubjects } from '@/services/content/subjects'
import { fetchAllLessons } from '@/services/content/lessons'
import { fetchModuleAnswerKeys, fetchModuleQuestions, pruneModuleCaches } from '@/services/content/moduleContent'
import { gradeLocally, savePendingAttempt } from '@/services/offline/offlineAttempts'
import { isTransientFailure } from '@/services/offline/isTransientFailure'
import { fetchLessonStageMap, inStage } from '@/services/content/lessonStages'
import { getGuestFlags, toggleGuestFlag, enrichGuestFlagsWithResults, addGuestHistory } from '@/services/history/reviewStorage'
import { loadSavedActiveExam, persistActiveExam, clearActiveExam } from '@/services/exam/activeExam'
import { storageGet, storageSet } from '@/core/safeStorage'
import { fetchSimulatorConfig, drawSimulator, drawProportional, simulatorTotal, QUIZ_MAX_QUESTIONS } from '@/services/exam/stageSimulator'
import { clearHomeHistory } from '@/services/content/homeData'
import { saveFullAttempt } from '@/services/history/fullHistory'
import { quizName } from '@/features/practice/quizNames'
import { optionLabels } from '@/features/practice/mcqShared'
import MCQBrowse from '@/features/practice/mcq/MCQBrowse'
import MCQExamFlow from '@/features/practice/mcq/MCQExamFlow'

const OFFLINE_KEYS_MESSAGE = "Answer keys for this module aren't saved on this device — open it once while online."
const OFFLINE_SAVED_MESSAGE = "Saved on this device — it will sync when you're back online. Points are added when it syncs."
const OFFLINE_SAVE_FAILED_MESSAGE = "This device couldn't save the attempt — your results are shown here only."

type StartType = 'mock' | 'practice' | 'simulator'

interface QuizConfig {
  type: string
  subjectId: string | null
  lessonId: string | null
  sourceFilter: string | null
  simulatorStage?: string | null
  stage?: string | null
}

interface SourceChoice {
  type: StartType
  subjectId: string | null
  lessonId: string | null
  stage: string | null
  allCount: number
  doctorCount: number
}

const stageOf = (config: QuizConfig | null) => config?.stage || config?.simulatorStage || null

function toResultMap(graded: any[] | null) {
  const map: Record<string, any> = {}
  ;(graded || []).forEach(r => {
    map[r.question_id] = { is_correct: r.is_correct, correct_answer: r.correct_answer, explanation: r.explanation }
  })
  return map
}

export default function MCQ({ dark }: { dark: boolean }) {
  const { user, fetchProfile } = useAuth() as any
  const { modules, modulesLoaded, modulesError } = useModules() as any
  const location = useLocation()
  const navigate = useNavigate()
  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void

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
  const [sourceChoice, setSourceChoice] = useState<SourceChoice | null>(null)
  const [quizStage, setQuizStage] = useState<string | null>(null)

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
    let ignore = false
    Promise.all([fetchAllSubjects(), fetchAllLessons()]).then(([subjectsRes, lessonsRes]) => {
      if (ignore) return
      setSubjects(subjectsRes.subjects)
      setLessons(lessonsRes.lessons)
      if (subjectsRes.error) setLoadError(true)
    })
    return () => {
      ignore = true
      clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!modulesLoaded) return
    if (modules.length === 0) {
      setLoading(false)
      return
    }
    if (activeModule) return
    const params = new URLSearchParams(location.search)
    const moduleParam = params.get('module')
    const fromLink = moduleParam && modules.find((m: any) => m.id === moduleParam)
    if (fromLink) { setActiveModule(fromLink.id); return }
    const active = modules.find((m: any) => m.status === 'active')
    setActiveModule(active ? active.id : modules[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesLoaded, modules])

  useEffect(() => {
    if (!modulesLoaded || modulesError) return
    pruneModuleCaches(new Set(modules.map((m: any) => m.id)))
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
      requestStart('practice', null, lessonFilter)
      clearAutoStartParams()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonFilter, questions])

  useEffect(() => {
    if (subjectFilter && !lessonFilter && !quizMode && questions.length > 0 && !autoStartedSubjectRef.current) {
      autoStartedSubjectRef.current = true
      requestStart('practice', subjectFilter, null)
      clearAutoStartParams()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter, lessonFilter, questions])

  useEffect(() => {
    if (!simulatorParam || autoStartedSimulatorRef.current || quizMode) return
    if (!activeModule || !simLoaded || !lessonStageMapLoaded || activeStage === 'all') return
    if (!questions.some(q => q.module_id === activeModule)) return
    autoStartedSimulatorRef.current = true
    requestStart('simulator', null, null, activeStage)
    clearAutoStartParams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulatorParam, quizMode, activeModule, activeStage, simLoaded, lessonStageMapLoaded, questions])

  useEffect(() => {
    if (quizMode) return
    let cancelled = false
    loadSavedActiveExam(user).then(saved => { if (!cancelled) setResumeData(saved) })
    return () => { cancelled = true }
  }, [user, quizMode])

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
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
      if (pendingPersistRef.current && !submittingRef.current) {
        persistActiveExam(userRef.current, { ...pendingPersistRef.current, savedAt: Date.now() })
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizMode, submitted, grading, currentIndex, quizQuestions, results, flaggedIds])

  async function fetchQuestionsForModule(moduleId: string, isIgnored: () => boolean = () => false) {
    setLoading(true)
    setUsingCache(false)

    fetchModuleAnswerKeys(moduleId)

    const { data, error } = await fetchModuleQuestions(moduleId, ({ data: fresh, error: refreshError }) => {
      if (isIgnored()) return
      if (refreshError) setUsingCache(true)
      else setQuestions(fresh)
    })

    if (isIgnored()) return
    if (error) setLoadError(true)
    else setQuestions(data)
    setLoading(false)
  }

  const moduleSubjects = subjects.filter(s => s.module_id === activeModule)
  const activeModuleObj = modules.find((m: any) => m.id === activeModule)

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

  const getPracticeQuestions = (subjectId: string | null, lessonId: string | null, sourceOnly: string | null = null) => {
    return questions.filter(q =>
      (lessonId ? q.lesson_id === lessonId : q.subject_id === subjectId) &&
      (q.exam_type === 'practice' || q.exam_type === 'both') &&
      inStage(q, activeStage, lessonStageMap) &&
      (!sourceOnly || q.source === sourceOnly)
    )
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

  function startTimer(startedAt: number) {
    clearInterval(timerRef.current)
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    tick()
    timerRef.current = setInterval(tick, 1000)
  }

  function beginQuiz(qs: any[], type: string, config: QuizConfig | null) {
    lastQuizConfigRef.current = config

    setQuizStage(stageOf(config))
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

  function startQuiz(type: string, subjectId: string | null = null, lessonId: string | null = null, sourceFilter: string | null = null) {
    const qs = drawProportional(
      type === 'mock' ? getFilteredQuestions('mock', sourceFilter) : getPracticeQuestions(subjectId, lessonId, sourceFilter),
      QUIZ_MAX_QUESTIONS
    )

    if (qs.length === 0) {
      showToast('❌ No questions available for this selection yet', 'error')
      return
    }

    beginQuiz(qs, type, { type, subjectId, lessonId, sourceFilter, simulatorStage: null, stage: activeStage === 'all' ? null : activeStage })
  }

  function startSimulator(stage: string, sourceFilter: string | null = null) {
    const rows = simRows.filter(r => r.stage === stage)
    const qs = drawSimulator(questions, rows, stage, lessonStageMap, sourceFilter)
    if (qs.length === 0) {
      showToast('❌ No simulator questions available for this stage yet', 'error')
      return
    }
    beginQuiz(qs, 'simulator', { type: 'simulator', subjectId: null, lessonId: null, sourceFilter, simulatorStage: stage, stage })
  }

  function launch(type: StartType, subjectId: string | null, lessonId: string | null, stage: string | null, source: string | null) {
    if (type === 'simulator') startSimulator(stage as string, source)
    else startQuiz(type, subjectId, lessonId, source)
  }

  function scopeCount(type: StartType, subjectId: string | null, lessonId: string | null, stage: string | null, source: string | null) {
    if (type === 'simulator') {
      return simulatorTotal(questions, simRows.filter(r => r.stage === stage), stage as string, lessonStageMap, source)
    }
    return (type === 'mock' ? getFilteredQuestions('mock', source) : getPracticeQuestions(subjectId, lessonId, source)).length
  }

  function requestStart(type: StartType, subjectId: string | null = null, lessonId: string | null = null, stage: string | null = null) {
    const all = scopeCount(type, subjectId, lessonId, stage, null)
    const doctors = scopeCount(type, subjectId, lessonId, stage, 'university')
    if (doctors > 0 && doctors < all) {
      const shown = (n: number) => type === 'simulator' ? n : Math.min(n, QUIZ_MAX_QUESTIONS)
      setSourceChoice({ type, subjectId, lessonId, stage, allCount: shown(all), doctorCount: shown(doctors) })
      return
    }
    launch(type, subjectId, lessonId, stage, null)
  }

  function chooseSource(source: string | null) {
    if (!sourceChoice) return
    const { type, subjectId, lessonId, stage } = sourceChoice
    setSourceChoice(null)
    launch(type, subjectId, lessonId, stage, source)
  }

  function startRetryQuiz(list: any[]) {
    if (!list || list.length === 0) {
      showToast('❌ No questions to retry', 'error')
      return
    }
    beginQuiz(list, 'retry', null)
  }

  function resumeExam() {
    if (!resumeData) return
    const startedAt = resumeData.savedAt && resumeData.startedAt
      ? Date.now() - (resumeData.savedAt - resumeData.startedAt)
      : resumeData.startedAt
    lastQuizConfigRef.current = resumeData.quizConfig || null
    setQuizStage(stageOf(resumeData.quizConfig || null))
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
    setQuizStage(null)
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

    let result: any = (await gradeLocally([q], [opt]))?.[q.id] ?? null
    let serverRejected = false
    if (!result && navigator.onLine) {
      const response = await supabase.rpc('grade_mcq', { p_answers: [{ id: q.id, answer: opt }] })
      const graded = response.error ? null : response.data?.[0]
      if (graded) result = { is_correct: graded.is_correct, correct_answer: graded.correct_answer, explanation: graded.explanation }
      else serverRejected = !isTransientFailure(response)
    }

    gradingInFlightRef.current.delete(qi)
    if (!isMountedRef.current || sessionId !== sessionIdRef.current) return
    if (result) setResults(prev => ({ ...prev, [q.id]: result }))
    else if (serverRejected) showToast('⚠️ Could not grade that answer — check your connection and try again', 'error')
    else showToast(OFFLINE_KEYS_MESSAGE, 'info')
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
    if (config?.simulatorStage) { startSimulator(config.simulatorStage, config.sourceFilter); return }
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
    const attemptId = crypto.randomUUID()

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

    let resultMap: Record<string, any> | null = null
    let attemptedOnline = false

    if (navigator.onLine) {
      attemptedOnline = true
      const response = user
        ? await supabase.rpc('submit_quiz_attempt', {
            p_answers: payload,
            p_module_id: historyModuleId,
            p_quiz_type: quizMode,
            p_subject_id: historySubjectId,
            p_time_sec: timeSec,
            p_stage: quizStage,
            p_attempt_id: attemptId
          })
        : await supabase.rpc('grade_mcq', { p_answers: payload })

      if (!isMountedRef.current) {
        if (!response.error && user) clearActiveExam(user)
        submittingRef.current = false
        return
      }

      if (!response.error) {
        resultMap = toResultMap(response.data)
        if (user) { fetchProfile(user.id); clearHomeHistory() }
      } else if (!isTransientFailure(response)) {
        setGrading(false)
        showToast('⚠️ Could not submit — check your connection and try again', 'error')
        submittingRef.current = false
        return
      }
    }

    const gradedOffline = !resultMap
    if (!resultMap) {
      resultMap = await gradeLocally(quizQuestions, quizQuestions.map((_, i) => answers[i] || null))
      if (!isMountedRef.current) { submittingRef.current = false; return }
      if (!resultMap) {
        setGrading(false)
        showToast(OFFLINE_KEYS_MESSAGE, 'error')
        submittingRef.current = false
        return
      }
    }

    if (!user || gradedOffline) {
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

      const correctCount = quizQuestions.filter(q => resultMap[q.id]?.is_correct).length
      const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0

      if (user) {
        const saved = await savePendingAttempt({
          id: attemptId, stage: quizStage, userId: user.id, moduleId: historyModuleId, subjectId: historySubjectId, quizType: quizMode,
          timeSec, completedAt: Date.now(), answers: payload,
          total, correct: correctCount, score: scorePercent, incorrectQuestions: incorrectSnapshots,
          possibleDuplicate: attemptedOnline,
        })
        showToast(saved ? OFFLINE_SAVED_MESSAGE : OFFLINE_SAVE_FAILED_MESSAGE, saved ? 'info' : 'error')
      } else {
        enrichGuestFlagsWithResults(resultMap)
        addGuestHistory({
          id: attemptId, stage: quizStage, module_id: historyModuleId, quiz_type: quizMode, subject_id: historySubjectId,
          total, correct: correctCount, score: scorePercent, time_sec: timeSec,
          incorrect_questions: incorrectSnapshots
        })
      }
    }

    // Awaited so the device copy exists before the results screen opens.
    await saveFullAttempt(user?.id || null, {
      id: attemptId,
      questions: quizQuestions.map((q, i) => ({
        question_id: q.id,
        question: q.question,
        option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
        correct_answer: resultMap[q.id]?.correct_answer ?? null,
        explanation: resultMap[q.id]?.explanation ?? null,
        answer: answers[i] || null,
        is_correct: !!resultMap[q.id]?.is_correct,
        module_id: q.module_id || null,
        subject_id: q.subject_id || null,
        lesson_id: q.lesson_id || null,
        source: q.source || null,
      })),
    }).catch(() => {})

    if (!isMountedRef.current) { submittingRef.current = false; return }

    setResults(resultMap)
    setGrading(false)
    setSubmitted(true)
    window.scrollTo({ top: 0 })

    clearActiveExam(user)

    setFinishTimeSec(elapsedSeconds)
    submittingRef.current = false
  }

  const quizTitle = quizName(quizMode || 'practice', quizStage ? stages.find((s: any) => s.value === quizStage)?.title : undefined)

  if (quizMode) {
    return (
      <MCQExamFlow
        dark={dark}
        quizMode={quizMode}
        quizTitle={quizTitle}
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
      getPracticeQuestions={getPracticeQuestions}
      onStartQuiz={requestStart}
      onStartSimulator={stage => requestStart('simulator', null, null, stage)}
      sourceChoice={sourceChoice}
      onChooseAll={() => chooseSource(null)}
      onChooseDoctors={() => chooseSource('university')}
      onCancelChoice={() => setSourceChoice(null)}
    />
  )
}
