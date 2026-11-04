import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth, useModules } from '@/core/contexts'
import { getPulseTheme, pulseType, ON_GRADIENT_TOP } from '@/shared/theme/premiumTheme'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import PageShell from '@/shared/ui/layout/PageShell'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import EmptyState from '@/shared/ui/feedback/EmptyState'
import { CardRowsSkeleton } from '@/shared/ui/feedback/Skeletons'
import { useToast } from '@/shared/ui/feedback/ToastProvider'
import { ModuleIcon } from '@/shared/icons/medicalIcons'
import { FlashcardIcon } from '@/shared/icons/FlashcardIcon'
import { LightbulbIcon, EmptyBoxIcon } from '@/shared/icons/tool-icons'
import { fetchModuleFlashcards } from '@/services/content/moduleContent'
import { fetchLessonsForModule } from '@/services/content/lessons'
import { fetchLessonStageMap, inStage } from '@/services/content/lessonStages'
import { loadProgress, saveReview, syncProgress } from '@/services/flashcards/progress'
import {
  buildSession, emptyCard, fromStored, isDue, newerProgress, reviewCard, toStored,
  type Answer, type ProgressMap,
} from '@/services/flashcards/scheduler'
import { FLASHCARD_ACCENT, FLASHCARD_ACCENT_DEEP } from '@/shared/theme/accents'
import FlashcardStudy from '@/features/practice/flashcards/FlashcardStudy'

interface FlashcardModule { id: string; name: string; icon?: string | null; color: string; status: 'active' | 'completed' }
interface FlashcardRow { id: string; lesson_id: string; front: string; back: string; created_at: string }
interface FlashcardLesson { id: string; title: string }
interface Session { lessonId: string; title: string; queue: FlashcardRow[]; run: number }

const PAGE_MAX_WIDTH = 900

// Lists a module's lessons that have flashcards and runs study sessions for them.
function ModuleFlashcards({ mod, dark, stage, initialLessonId }: {
  mod: FlashcardModule; dark: boolean; stage: string; initialLessonId?: string
}) {
  const pt = getPulseTheme(dark)
  const { user } = useAuth() as { user: { id: string } | null }
  const showToast = useToast() as (message: string, type?: 'success' | 'error' | 'info') => void
  const userId = user?.id ?? null
  const accent = dark ? FLASHCARD_ACCENT : FLASHCARD_ACCENT_DEEP

  const [cards, setCards] = useState<FlashcardRow[]>([])
  const [lessons, setLessons] = useState<FlashcardLesson[]>([])
  const [lessonStageMap, setLessonStageMap] = useState<Record<string, string[]>>({})
  const [progress, setProgress] = useState<ProgressMap>({})
  const [loading, setLoading] = useState(true)
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const autoStartedRef = useRef(false)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    Promise.all([
      fetchModuleFlashcards(mod.id, ({ data, error }: any) => { if (!ignore && !error) setCards(data) }),
      fetchLessonsForModule(mod.id),
      fetchLessonStageMap(),
    ]).then(([cardsRes, lessonsRes, stageRes]: any[]) => {
      if (ignore) return
      if (cardsRes.data) setCards(cardsRes.data)
      setLessons(lessonsRes.lessons)
      setLessonStageMap(stageRes.map)
      if (cardsRes.error || lessonsRes.error) setLoadError(true)
      setLoading(false)
    })
    return () => { ignore = true }
  }, [mod.id])

  // Loads progress from the device, then syncs on open, reconnect, tab hide and leave.
  useEffect(() => {
    let ignore = false
    setProgressLoaded(false)
    loadProgress(userId, mod.id).then(local => {
      if (ignore) return
      setProgress(prev => newerProgress(local, prev))
      setProgressLoaded(true)
    })

    function pull() {
      syncProgress(userId, mod.id).then(merged => {
        if (!ignore && merged) setProgress(prev => newerProgress(prev, merged))
      })
    }
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

  // Builds a session for a lesson from its due and new cards.
  function start(lessonId: string, run = 0) {
    const queue = buildSession(cards.filter(c => c.lesson_id === lessonId), progress, new Date())
    if (queue.length === 0) {
      showToast(run > 0 ? 'No more cards for now' : "You're all caught up on this lesson", 'info')
      setSession(null)
      return
    }
    setSession({ lessonId, title: lessons.find(l => l.id === lessonId)?.title || 'Flashcards', queue, run })
  }

  // Opens the lesson from the link once cards and saved progress are ready.
  useEffect(() => {
    if (!initialLessonId || autoStartedRef.current || loading || !progressLoaded) return
    autoStartedRef.current = true
    start(initialLessonId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, progressLoaded])

  // Schedules the card from the answer and saves it on the device.
  function rate(cardId: string, answer: Answer) {
    const now = new Date()
    const saved = progress[cardId]
    const next = toStored(reviewCard(saved ? fromStored(saved) : emptyCard(now), answer, now), now)
    setProgress(prev => ({ ...prev, [cardId]: next }))
    saveReview(userId, mod.id, cardId, next)
  }

  function pushProgress() {
    syncProgress(userId, mod.id).then(merged => { if (merged) setProgress(prev => newerProgress(prev, merged)) })
  }

  if (session) return (
    <PageShell dark={dark} backFallback={`/module/${mod.id}`} maxWidth={PAGE_MAX_WIDTH}>
      <FlashcardStudy
        key={`${session.lessonId}-${session.run}`}
        dark={dark}
        title={session.title}
        queue={session.queue}
        onRate={rate}
        onFinish={pushProgress}
        onMore={() => start(session.lessonId, session.run + 1)}
        onExit={() => { setSession(null); pushProgress() }}
      />
    </PageShell>
  )

  const now = new Date()
  const lessonRows = lessons
    .filter(l => cards.some(c => c.lesson_id === l.id) && inStage({ lesson_id: l.id }, stage, lessonStageMap))
    .map(lesson => {
      const lessonCards = cards.filter(c => c.lesson_id === lesson.id)
      const toStudy = lessonCards.filter(c => !progress[c.id] || isDue(progress[c.id], now)).length
      return { lesson, total: lessonCards.length, toStudy }
    })

  return (
    <PageShell dark={dark} backFallback={`/module/${mod.id}`} maxWidth={PAGE_MAX_WIDTH}>
      <div style={{ textAlign: 'center', padding: '10px 0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <ModuleIcon value={mod.icon} size={44} color={mod.color} />
        </div>
        <h1 style={{ ...pulseType.pageTitle, fontSize: 24, color: mod.color, marginBottom: 6, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{mod.name}</h1>
        <div style={{ color: ON_GRADIENT_TOP.muted, fontSize: 13, fontWeight: 600 }}>Flashcards</div>
      </div>

      {loadError && <ErrorBanner />}

      {!user && (
        <div style={{ marginBottom: 16 }}>
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: '12px 18px', textAlign: 'center' }}>
            <span style={{ color: pt.cobalt, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LightbulbIcon color={pt.cobalt} size={14} /> Your progress is saved on this device only. Sign in to keep it across devices.
            </span>
          </LiquidGlassCard>
        </div>
      )}

      {loading && <CardRowsSkeleton count={3} label="Loading flashcards" />}

      {!loading && lessonRows.length === 0 && !loadError && (
        <EmptyState dark={dark} icon={<EmptyBoxIcon color={pt.sub} size={16} />} message="No flashcards here yet" />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!loading && lessonRows.map(({ lesson, total, toStudy }, i) => (
          <LiquidGlassCard
            key={lesson.id} dark={dark} delay={i * 70} onClick={() => start(lesson.id)}
            style={{ padding: 'clamp(14px, 3vw, 18px) clamp(14px, 3vw, 22px)', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: `${accent}20`, border: `1px solid ${accent}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FlashcardIcon color={accent} size={20} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                ...pulseType.cardTitle, color: pt.textPrimary, fontSize: 15,
                display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
                overflow: 'hidden', wordBreak: 'break-word', overflowWrap: 'anywhere',
              }}>{lesson.title}</div>
              <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2 }}>{total} card{total === 1 ? '' : 's'}</div>
            </div>
            <div style={{
              background: toStudy > 0 ? FLASHCARD_ACCENT_DEEP : 'transparent',
              color: toStudy > 0 ? '#fff' : pt.textMuted,
              border: toStudy > 0 ? 'none' : `1px solid ${pt.border}`,
              borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap',
            }}>{toStudy > 0 ? `${toStudy} to study` : '✓ Caught up'}</div>
          </LiquidGlassCard>
        ))}
      </div>
    </PageShell>
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
