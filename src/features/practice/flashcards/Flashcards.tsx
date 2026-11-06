import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth, useModules } from '@/core/contexts'
import { ON_GRADIENT_TOP } from '@/shared/theme/premiumTheme'
import PageShell from '@/shared/ui/layout/PageShell'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import { useToast } from '@/shared/ui/feedback/ToastProvider'
import { fetchModuleFlashcards } from '@/services/content/moduleContent'
import { fetchLessonsForModule } from '@/services/content/lessons'
import { fetchSubjectsForModule } from '@/services/content/subjects'
import { fetchModuleStages } from '@/services/content/moduleStages'
import { fetchLessonStageMap, inStage } from '@/services/content/lessonStages'
import { loadProgress, saveReview, syncProgress } from '@/services/flashcards/progress'
import { SESSION_SIZE, buildPracticeSession, buildSession, emptyCard, fromStored, isDue, newerProgress, reviewCard, toStored, type Answer, type ProgressMap, } from '@/services/flashcards/scheduler'
import { FLASHCARD_ACCENT } from '@/shared/theme/accents'
import FlashcardStudy from '@/features/practice/flashcards/FlashcardStudy'
import FlashcardsBrowse, { type SubjectGroup } from '@/features/practice/flashcards/FlashcardsBrowse'

interface FlashcardModule { id: string; name: string; icon?: string | null; color: string; status: 'active' | 'completed' }
interface FlashcardRow { id: string; lesson_id: string; front: string; back: string; created_at: string }
interface FlashcardLesson { id: string; title: string; subject_id: string }
interface FlashcardSubject { id: string; name: string; icon?: string | null; color?: string | null }
// `lessonId` and `subjectId` are both null for the "study all due" session; `practice` sessions never change the saved schedule.
interface Session { lessonId: string | null; subjectId: string | null; title: string; queue: FlashcardRow[]; run: number; practice: boolean }

const PAGE_MAX_WIDTH = 900

// Loads a module's flashcards, runs study sessions and shows the browse page.
function ModuleFlashcards({ mod, dark, stage: initialStage, initialLessonId }: {
  mod: FlashcardModule; dark: boolean; stage: string; initialLessonId?: string
}) {
  const { user } = useAuth() as { user: { id: string } | null }
  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void
  const userId = user?.id ?? null

  const [cards, setCards] = useState<FlashcardRow[]>([])
  const [lessons, setLessons] = useState<FlashcardLesson[]>([])
  const [subjects, setSubjects] = useState<FlashcardSubject[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [activeStage, setActiveStage] = useState(initialStage)
  const [lessonStageMap, setLessonStageMap] = useState<Record<string, string[]>>({})
  const [progress, setProgress] = useState<ProgressMap>({})
  const [loading, setLoading] = useState(true)
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const autoStartedRef = useRef(false)

  // Loads the module's cards (cached), lessons, subjects, stages and lesson stages.
  useEffect(() => {
    let ignore = false
    setLoading(true)
    Promise.all([
      fetchModuleFlashcards(mod.id, ({ data, error }: any) => { if (!ignore && !error) setCards(data) }),
      fetchLessonsForModule(mod.id),
      fetchLessonStageMap(),
      fetchSubjectsForModule(mod.id),
      fetchModuleStages(mod.id),
    ]).then(([cardsRes, lessonsRes, stageRes, subjectsRes, stagesRes]: any[]) => {
      if (ignore) return
      if (cardsRes.data) setCards(cardsRes.data)
      setLessons(lessonsRes.lessons)
      setLessonStageMap(stageRes.map)
      setSubjects(subjectsRes.subjects)
      setStages(stagesRes)
      if (cardsRes.error || lessonsRes.error || subjectsRes.error) setLoadError(true)
      setLoading(false)
    })
    return () => { ignore = true }
  }, [mod.id])

  // Loads saved progress from the device, then syncs with the server on open, reconnect, tab hide and leave.
  useEffect(() => {
    let ignore = false
    setProgressLoaded(false)
    loadProgress(userId, mod.id).then(local => {
      if (ignore) return
      setProgress(prev => newerProgress(local, prev))
      setProgressLoaded(true)
    })

    // Uploads pending reviews and applies newer server progress.
    function pull() {
      syncProgress(userId, mod.id).then(merged => {
        if (!ignore && merged) setProgress(prev => newerProgress(prev, merged))
      })
    }
    // Uploads pending reviews when the tab is hidden.
    function onHidden() {
      if (document.visibilityState === 'hidden') syncProgress(userId, mod.id)
    }

    pull()
    window.addEventListener('online', pull)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      ignore = true
      window.removeEventListener('online', pull)
      document.removeEventListener('visibilitychange', onHidden)
      syncProgress(userId, mod.id)
    }
  }, [userId, mod.id])

  // Lessons that have cards, and the stages that contain at least one of them.
  const lessonsWithCards = useMemo(() => lessons.filter(l => cards.some(c => c.lesson_id === l.id)), [lessons, cards])
  const visibleStages = useMemo(
    () => stages.filter(s => lessonsWithCards.some(l => inStage({ lesson_id: l.id }, s.value, lessonStageMap))),
    [stages, lessonsWithCards, lessonStageMap]
  )
  const stage = loading || activeStage === 'all' || visibleStages.some(s => s.value === activeStage) ? activeStage : 'all'

  // Cards of the lessons shown for the current stage (used by the "study all due" session).
  const visibleCards = useMemo(() => {
    const lessonIds = new Set(lessons.filter(l => inStage({ lesson_id: l.id }, stage, lessonStageMap)).map(l => l.id))
    return cards.filter(c => lessonIds.has(c.lesson_id))
  }, [cards, lessons, lessonStageMap, stage])

  // Starts a session for a card list: due and new cards first, or a "review anyway" practice session when none are left.
  function begin(pool: FlashcardRow[], meta: Pick<Session, 'lessonId' | 'subjectId' | 'title'>, run: number) {
    const due = buildSession(pool, progress, new Date())
    const practice = due.length === 0
    const queue = practice ? buildPracticeSession(pool) : due
    if (queue.length === 0) {
      showToast('No cards here yet', 'info')
      setSession(null)
      return
    }
    setSession({ ...meta, queue, run, practice })
    window.scrollTo({ top: 0 })
  }

  // Starts a session for one lesson.
  function start(lessonId: string, run = 0) {
    begin(
      cards.filter(c => c.lesson_id === lessonId),
      { lessonId, subjectId: null, title: lessons.find(l => l.id === lessonId)?.title || 'Flashcards' },
      run
    )
  }

  // Starts a session for every lesson of a subject in the current stage.
  function startSubject(subjectId: string, run = 0) {
    const lessonIds = new Set(
      lessons.filter(l => l.subject_id === subjectId && inStage({ lesson_id: l.id }, stage, lessonStageMap)).map(l => l.id)
    )
    begin(
      cards.filter(c => lessonIds.has(c.lesson_id)),
      { lessonId: null, subjectId, title: subjects.find(s => s.id === subjectId)?.name || 'Flashcards' },
      run
    )
  }

  // Starts a session of due cards from every lesson (never-studied cards are left out); exits when nothing is due.
  function startAllDue(run = 0) {
    const queue = buildSession(visibleCards, progress, new Date(), SESSION_SIZE, 0)
    if (queue.length === 0) {
      showToast("You're all caught up", 'info')
      setSession(null)
      return
    }
    setSession({ lessonId: null, subjectId: null, title: 'All due cards', queue, run, practice: false })
    window.scrollTo({ top: 0 })
  }

  // Opens the lesson from the link once cards and saved progress are ready.
  useEffect(() => {
    if (!initialLessonId || autoStartedRef.current || loading || !progressLoaded) return
    autoStartedRef.current = true
    start(initialLessonId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, progressLoaded])

  // Schedules the card from the answer and saves it on the device (never called in practice sessions).
  function rate(cardId: string, answer: Answer) {
    const now = new Date()
    const saved = progress[cardId]
    const next = toStored(reviewCard(saved ? fromStored(saved) : emptyCard(now), answer, now), now)
    setProgress(prev => ({ ...prev, [cardId]: next }))
    saveReview(userId, mod.id, cardId, next)
  }

  // Uploads reviews made in the session.
  function pushProgress() {
    syncProgress(userId, mod.id).then(merged => { if (merged) setProgress(prev => newerProgress(prev, merged)) })
  }

  if (session) return (
    <FlashcardStudy
      key={`${session.lessonId ?? session.subjectId ?? 'due'}-${session.run}`}
      dark={dark}
      accent={FLASHCARD_ACCENT}
      title={session.title}
      queue={session.queue}
      practice={session.practice}
      onRate={rate}
      onFinish={pushProgress}
      onMore={() => {
        if (session.lessonId) start(session.lessonId, session.run + 1)
        else if (session.subjectId) startSubject(session.subjectId, session.run + 1)
        else startAllDue(session.run + 1)
      }}
      onExit={() => { setSession(null); pushProgress() }}
    />
  )

  const now = new Date()
  const groups: SubjectGroup[] = subjects
    .map(subject => {
      const rows = lessons
        .filter(l => l.subject_id === subject.id && inStage({ lesson_id: l.id }, stage, lessonStageMap))
        .map(lesson => {
          const lessonCards = cards.filter(c => c.lesson_id === lesson.id)
          const due = lessonCards.filter(c => progress[c.id] && isDue(progress[c.id], now)).length
          const fresh = lessonCards.filter(c => !progress[c.id]).length
          return { lesson, total: lessonCards.length, due, toStudy: due + fresh }
        })
        .filter(row => row.total > 0)
      return {
        subject,
        rows,
        total: rows.reduce((sum, r) => sum + r.total, 0),
        due: rows.reduce((sum, r) => sum + r.due, 0),
        toStudy: rows.reduce((sum, r) => sum + r.toStudy, 0),
      }
    })
    .filter(group => group.rows.length > 0)

  const dueTotal = groups.reduce((sum, g) => sum + g.due, 0)
  const dueLessons = groups.reduce((sum, g) => sum + g.rows.filter(r => r.due > 0).length, 0)
  const totalCards = groups.reduce((sum, g) => sum + g.total, 0)

  return (
    <FlashcardsBrowse
      dark={dark}
      mod={mod}
      signedIn={!!user}
      loading={loading}
      loadError={loadError}
      progressLoaded={progressLoaded}
      stages={visibleStages}
      activeStage={stage}
      onSelectStage={setActiveStage}
      groups={groups}
      totalCards={totalCards}
      dueTotal={dueTotal}
      dueLessons={dueLessons}
      onStartDue={() => startAllDue()}
      onStartSubject={subjectId => startSubject(subjectId)}
      onStartLesson={lessonId => start(lessonId)}
    />
  )
}

// Flashcards page: resolves the module from the link and shows its lessons.
export default function Flashcards({ dark }: { dark: boolean }) {
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: FlashcardModule[]; modulesLoaded: boolean; modulesError: boolean }
  const params = new URLSearchParams(useLocation().search)
  const moduleParam = params.get('module')

  const resolvedModule: FlashcardModule | null =
    (moduleParam && modules.find(m => m.id === moduleParam)) ||
    modules.find(m => m.status === 'active') ||
    modules[0] ||
    null

  if (resolvedModule) return (
    <ModuleFlashcards
      key={resolvedModule.id}
      mod={resolvedModule}
      dark={dark}
      stage={params.get('stage') || 'all'}
      initialLessonId={params.get('lesson') || undefined}
    />
  )

  return (
    <PageShell dark={dark} backFallback="/" maxWidth={PAGE_MAX_WIDTH}>
      <div style={{ textAlign: 'center', padding: 40, color: ON_GRADIENT_TOP.secondary }}>
        {modulesError
          ? <ErrorBanner message="Couldn't load modules — check your connection." />
          : !modulesLoaded ? 'Loading...' : 'No modules available yet.'}
      </div>
    </PageShell>
  )
}
