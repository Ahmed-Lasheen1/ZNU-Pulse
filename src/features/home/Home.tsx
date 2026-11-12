import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useAuth, useModules, useHomeEntrance } from '@/core/contexts'
import { getPulseTheme, pulseFonts, pulseType, ON_BACKGROUND } from '@/shared/theme/premiumTheme'
import { adaptColor } from '@/shared/theme/adaptColor'
import ErrorBanner from '@/shared/ui/feedback/ErrorBanner'
import { computeStreak } from '@/features/home/streak'
import { nextUpcomingExam } from '@/features/home/upcomingExam'
import HomeNoticeCard from '@/features/home/HomeNoticeCard'
import { relativeDayLabel } from '@/features/tools/schedule'
import { quizName } from '@/features/practice/quizNames'
import { getGuestHistory } from '@/services/history/reviewStorage'
import { loadSavedActiveExamSummary } from '@/services/exam/activeExam'
import { fetchSubjectById } from '@/services/content/subjects'
import { fetchModuleStages } from '@/services/content/moduleStages'
import { fetchModuleFlashcards } from '@/services/content/moduleContent'
import { loadDueCounts, loadReviewTimes } from '@/services/flashcards/progress'
import { ENTRANCE_PAUSE, LOGO_DELAY } from '@/shared/theme/pulseMotion'
import { NotifyPermissionButton } from '@/features/notifications'
import { GuestSignInButton } from '@/features/account'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import EcgHero from '@/features/home/EcgHero'
import AutoDirText from '@/shared/ui/display/AutoDirText'
import { ScheduleIcon, ChecklistIcon, AnonQAIcon, LeaderboardIcon, LightningIcon, CheckCircleIcon, WeeklyReportIcon, StreakFlameIcon } from '@/shared/icons/tool-icons'
import { FlashcardIcon } from '@/shared/icons/FlashcardIcon'
import { NumberTicker } from '@/shared/ui/motion/number-ticker'
import { ModuleIcon, ExamIcon } from '@/shared/icons/medicalIcons'
import { accuracyTier, accuracyColor, type AccuracyTier } from '@/shared/utils/accuracy'
import { plural } from '@/shared/utils/format'
import { FLASHCARD_ACCENT, MCQ_ACCENT } from '@/shared/theme/accents'
import { fetchHomeAnnouncement, fetchHomeHistory, fetchExamSchedules } from '@/services/content/homeData'
import { ReportGridSkeleton, CardRowsSkeleton } from '@/shared/ui/feedback/Skeletons'

interface HomeModule {
  id: string; name: string; icon?: string | null; color: string; status: 'active' | 'completed'
}

// Summary of the paused exam shown as a Home notice.
interface PausedExamInfo {
  moduleId: string | null
  quizMode: string
  stage: string | null
  answered: number
  total: number
  title: string
}

// Entrance settings handed to a card (see cardEntrance below).
interface CardEntrance { instant: boolean; delay: number }

// One notice card of the Home column, rendered once its entrance settings are known.
interface NoticeEntry { key: string; render: (entrance: CardEntrance) => JSX.Element }

const toolCards = [
  { Icon: ScheduleIcon, title: 'Schedules', sub: 'Plan your study time', to: '/schedule', accent: 'indigo' },
  { Icon: ChecklistIcon, title: 'Checklist', sub: 'Track your progress', to: '/checklist', accent: 'amber' },
  { Icon: AnonQAIcon, title: 'Pulse Check', sub: 'Ask, suggest & vote', to: '/pulse-check', accent: 'indigo' },
  { Icon: LeaderboardIcon, title: 'Leaderboard', sub: 'See where you stand', to: '/profile?tab=leaderboard', accent: 'amber' },
] as const

const HOME_HISTORY_LIMIT = 200

// An exam this many days away or fewer is highlighted as urgent.
const EXAM_URGENT_DAYS = 2

// The exam notice only appears when the next exam is this many days away or fewer.
const EXAM_NOTICE_DAYS = 7

// Longest the notice cards wait for all their data before showing what is ready.
const NOTICE_WAIT_MS = 2000

// Seconds between consecutive notice cards during the entrance.
const NOTICE_STAGGER = 0.15

const MODULE_BLURBS: Record<string, string> = {
  neuro: 'Explore the wonders of the nervous system',
  cardio: 'Understand the heart and blood vessels',
  respirat: 'Study the mechanics of breathing',
  digest: 'Learn the process of nourishment',
  gastro: 'Learn the process of nourishment',
}

// Returns the one-line description shown under a module name.
function moduleBlurb(name: string) {
  const key = Object.keys(MODULE_BLURBS).find(k => name.toLowerCase().includes(k))
  return key ? MODULE_BLURBS[key] : 'Master the essentials of this module.'
}

// Picks the encouragement label and color for the week's accuracy.
function weeklyAccuracyFeedback(accuracy: number, pt: ReturnType<typeof getPulseTheme>) {
  const labels: Record<AccuracyTier, string> = {
    excellent: 'Outstanding week!',
    great: 'Great progress!',
    good: 'Nice and steady.',
    keep_practicing: "Keep pushing — you've got this.",
    needs_work: "Let's turn it around this week.",
  }
  return { label: labels[accuracyTier(accuracy)], color: accuracyColor(accuracy, pt) }
}

const statNumStyle = { ...pulseType.display, fontSize: 28, lineHeight: 1.1 }

const HERO_DELAY = ENTRANCE_PAUSE
const NOTIFY_DELAY = LOGO_DELAY + 0.3
const WEEKLY_REPORT_START = LOGO_DELAY + 0.6
// Report counters start once the weekly report card has mostly faded in.
const REPORT_COUNT_START = WEEKLY_REPORT_START + 0.5
const ACTIVE_MODULES_START = WEEKLY_REPORT_START + 0.6
const TOOLS_START = ACTIVE_MODULES_START + 0.6
const COMPLETED_MODULES_START = TOOLS_START + 0.6
const FOOTER_DELAY = TOOLS_START + 0.8

// Converts an entrance time in seconds into the delay LiquidGlassCard expects.
function msFor(targetSeconds: number) {
  return Math.round(((targetSeconds - ENTRANCE_PAUSE) / 1.5) * 1000)
}

interface WeeklySummary { totalAttempted: number; accuracy: number; topSubjectName: string | null }

// Home dashboard: weekly report, notices, active modules, tools and completed modules.
export default function Home({ dark }: { dark: boolean }) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const { user } = useAuth() as { user: any }
  const userId: string | undefined = user?.id
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: HomeModule[]; modulesLoaded: boolean; modulesError: boolean }
  const [announcement, setAnnouncement] = useState('')
  const [streak, setStreak] = useState(0)
  const [pausedExam, setPausedExam] = useState<PausedExamInfo | null>(null)
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null)
  const [reportLoading, setReportLoading] = useState(true)
  // Seconds the report counters wait before counting, fixed once the data arrives.
  const [tickerDelay, setTickerDelay] = useState(0)
  const [dueByModule, setDueByModule] = useState<Record<string, number>>({})
  const [examSchedules, setExamSchedules] = useState<any[]>([])

  // Each notice source flips its flag once it has settled, so the cards can enter together.
  const [announcementLoaded, setAnnouncementLoaded] = useState(false)
  const [examsLoaded, setExamsLoaded] = useState(false)
  const [pausedLoaded, setPausedLoaded] = useState(false)
  const [dueLoaded, setDueLoaded] = useState(false)
  const [noticeWaitOver, setNoticeWaitOver] = useState(false)

  const [archiveOpen, setArchiveOpen] = useState(false)

  const [archiveOverflowVisible, setArchiveOverflowVisible] = useState(false)

  // Lets the completed-modules list overflow visibly again once it is closed.
  useEffect(() => {
    if (!archiveOpen) setArchiveOverflowVisible(false)
  }, [archiveOpen])

  const { playEntrance: entranceNow } = useHomeEntrance() as { playEntrance: boolean }
  const [playEntrance] = useState(entranceNow)

  const mountedAtRef = useRef(Date.now())
  // Seconds left until an entrance target time, counted from when Home mounted.
  const remainingFor = (target: number) =>
    playEntrance ? Math.max(0, target - (Date.now() - mountedAtRef.current) / 1000) : 0
  // Entrance settings for a card whose reveal may already be overdue.
  const cardEntrance = (target: number): CardEntrance => {
    const remaining = remainingFor(target)
    return remaining <= 0
      ? { instant: true, delay: 0 }
      : { instant: false, delay: msFor(Math.max(remaining, ENTRANCE_PAUSE)) }
  }

  // Stops the notice cards from waiting forever if one of their requests is slow.
  useEffect(() => {
    const timer = setTimeout(() => setNoticeWaitOver(true), NOTICE_WAIT_MS)
    return () => clearTimeout(timer)
  }, [])

  // Loads the Home announcement text.
  useEffect(() => {
    let ignore = false
    fetchHomeAnnouncement(value => { if (!ignore) setAnnouncement(value) })
      .then(({ data }) => {
        if (ignore) return
        setAnnouncement(data?.value || '')
        setAnnouncementLoaded(true)
      })
    return () => { ignore = true }
  }, [])

  // Loads the exam schedules (cached) used for the next-exam countdown.
  useEffect(() => {
    let ignore = false
    fetchExamSchedules().then(({ data }: { data: any[] | null }) => {
      if (ignore) return
      setExamSchedules(data || [])
      setExamsLoaded(true)
    })
    return () => { ignore = true }
  }, [])

  // Loads the streak (quiz attempts plus flashcard reviews) and the weekly quiz report.
  useEffect(() => {
    let ignore = false
    async function loadStreakAndWeeklySummary() {
      setReportLoading(true)
      const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000

      const [rows, reviewTimes]: [any[], string[]] = await Promise.all([
        userId ? fetchHomeHistory(userId, HOME_HISTORY_LIMIT) : Promise.resolve(getGuestHistory()),
        loadReviewTimes(userId ?? null),
      ])
      if (ignore) return

      setStreak(computeStreak([...rows.map((r: any) => r.completed_at), ...reviewTimes]))

      const weeklyRows = rows.filter((r: any) => {
        const ts = typeof r.completed_at === 'number' ? r.completed_at : new Date(r.completed_at).getTime()
        return ts >= weekAgoMs
      })

      // Counters start now: late data gets no extra wait, early data waits for the report card to appear.
      if (weeklyRows.length === 0) {
        setWeeklySummary(null)
        setTickerDelay(remainingFor(REPORT_COUNT_START))
        setReportLoading(false)
        return
      }

      const totalAttempted = weeklyRows.reduce((a, h) => a + h.total, 0)
      const totalCorrect = weeklyRows.reduce((a, h) => a + h.correct, 0)
      const accuracy = totalAttempted > 0 ? Math.round((100 * totalCorrect) / totalAttempted) : 0

      const bySubject: Record<string, number> = {}
      weeklyRows.forEach(h => { if (h.subject_id) bySubject[h.subject_id] = (bySubject[h.subject_id] || 0) + h.total })
      const topSubjectId = Object.entries(bySubject).sort((a, b) => b[1] - a[1])[0]?.[0] || null

      let topSubjectName: string | null = null
      if (topSubjectId) {
        const { subject } = await fetchSubjectById(topSubjectId)
        if (ignore) return
        topSubjectName = subject?.name || null
      }

      if (ignore) return
      setWeeklySummary({ totalAttempted, accuracy, topSubjectName })
      setTickerDelay(remainingFor(REPORT_COUNT_START))
      setReportLoading(false)
    }
    loadStreakAndWeeklySummary()
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Loads due flashcard counts for each active module, counting only cards that still exist.
  useEffect(() => {
    if (!modulesLoaded) return
    let ignore = false
    async function loadDue() {
      const liveByModule: Record<string, Set<string>> = {}
      await Promise.all(
        modules.filter(m => m.status === 'active').map(async m => {
          const { data, error } = await fetchModuleFlashcards(m.id)
          if (!error && data) liveByModule[m.id] = new Set((data as { id: string }[]).map(c => c.id))
        })
      )
      const counts = await loadDueCounts(userId ?? null, liveByModule)
      if (ignore) return
      setDueByModule(counts)
      setDueLoaded(true)
    }
    loadDue()
    return () => { ignore = true }
  }, [userId, modulesLoaded, modules])

  // Loads the paused exam and names it the same way the MCQ page does (stage title when present).
  useEffect(() => {
    let ignore = false
    loadSavedActiveExamSummary(user)
      .then(async summary => {
        if (!summary) {
          if (!ignore) { setPausedExam(null); setPausedLoaded(true) }
          return
        }
        const stages = summary.moduleId && summary.stage ? await fetchModuleStages(summary.moduleId) : []
        const stageTitle = stages.find((s: any) => s.value === summary.stage)?.title
        const title = quizName(summary.quizMode, stageTitle)
        if (!ignore) { setPausedExam({ ...summary, title }); setPausedLoaded(true) }
      })
      // A failed read must not keep the notice cards hidden.
      .catch(() => { if (!ignore) setPausedLoaded(true) })
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const activeModules = modules.filter(m => m.status === 'active')
  const completedModules = modules.filter(m => m.status === 'completed')
  const dueModules = activeModules.filter(m => (dueByModule[m.id] || 0) > 0)
  // The exam notice is shown only once the next exam is within EXAM_NOTICE_DAYS.
  const nextExam = nextUpcomingExam(examSchedules, activeModules)
  const upcomingExam = nextExam && nextExam.days <= EXAM_NOTICE_DAYS ? nextExam : null
  const examColor = upcomingExam && upcomingExam.days <= EXAM_URGENT_DAYS ? pt.amber : pt.cobalt
  const pausedModule = pausedExam ? modules.find(m => m.id === pausedExam.moduleId) : undefined
  // Fixed accents as icon/badge colors, adjusted to stay readable in the current color mode.
  const mcqAccent = adaptColor(MCQ_ACCENT, dark)
  const flashcardAccent = adaptColor(FLASHCARD_ACCENT, dark)

  // Notices show together once every source has settled (due also waits for modules), or after the wait cap.
  const noticesReady = noticeWaitOver || (announcementLoaded && examsLoaded && pausedLoaded && dueLoaded)

  // Renders the notice cards in a fixed order, staggered by position, so none appears above one already shown.
  function renderNotices() {
    if (!noticesReady) return null

    const notices: NoticeEntry[] = []

    if (announcement) {
      notices.push({
        key: 'announcement',
        render: entrance => (
          <LiquidGlassCard dark={dark} delay={entrance.delay} instant={entrance.instant} style={{ padding: '16px 20px' }}>
            <AutoDirText text={announcement} style={{
              ...pulseType.bodyEmphasis, fontSize: 13, color: pt.textPrimary,
              lineHeight: 1.5, wordBreak: 'break-word'
            }} />
          </LiquidGlassCard>
        ),
      })
    }

    const exam = upcomingExam
    if (exam) {
      notices.push({
        key: 'exam',
        render: entrance => (
          <HomeNoticeCard
            dark={dark}
            accent={examColor}
            Icon={ExamIcon}
            title={<span dir="auto">{exam.title}</span>}
            body={exam.moduleName}
            badge={relativeDayLabel(exam.days)}
            onClick={() => navigate(`/schedule?module=${exam.moduleId}&type=exam`)}
            delay={entrance.delay}
            instant={entrance.instant}
          />
        ),
      })
    }

    const paused = pausedExam
    if (paused) {
      notices.push({
        key: 'paused-exam',
        render: entrance => (
          <HomeNoticeCard
            dark={dark}
            accent={mcqAccent}
            Icon={ExamIcon}
            title={paused.title}
            body={`${pausedModule?.name ?? 'Module'} · ${paused.answered}/${paused.total} answered`}
            onClick={() => navigate(paused.moduleId ? `/mcq?module=${paused.moduleId}` : '/mcq')}
            delay={entrance.delay}
            instant={entrance.instant}
          />
        ),
      })
    }

    dueModules.forEach(mod => {
      notices.push({
        key: `due-${mod.id}`,
        render: entrance => (
          <HomeNoticeCard
            dark={dark}
            accent={flashcardAccent}
            Icon={FlashcardIcon}
            title={`${plural(dueByModule[mod.id], 'flashcard')} due`}
            body={mod.name}
            onClick={() => navigate(`/flashcards?module=${mod.id}`)}
            delay={entrance.delay}
            instant={entrance.instant}
          />
        ),
      })
    })

    return notices.map((notice, i) => (
      <Fragment key={notice.key}>
        {notice.render(cardEntrance(WEEKLY_REPORT_START + NOTICE_STAGGER * (i + 1)))}
      </Fragment>
    ))
  }

  // Section heading with an optional icon that fades in during the entrance.
  const sectionTitle = (
    text: string,
    delaySeconds: number,
    Icon?: (p: { color: string; size?: number }) => JSX.Element,
    strong: boolean = false
  ) => {
    const color = strong ? ON_BACKGROUND.secondary : ON_BACKGROUND.muted
    return (
      <motion.h2
        initial={playEntrance ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: delaySeconds }}
        style={{
          ...pulseType.sectionLabel,
          color,
          marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
        {Icon && <Icon color={color} size={13} />}
        {text}
      </motion.h2>
    )
  }

  const weeklyFeedback = weeklySummary ? weeklyAccuracyFeedback(weeklySummary.accuracy, pt) : null

  return (
    <div style={{ position: 'relative', overflowX: 'hidden' }}>
      <div style={{
        position: 'relative', zIndex: 1,
        fontFamily: pulseFonts.body
      }}>
        <style>{`
          .pulse-fold {
            display: flex;
            flex-direction: column;
            gap: clamp(16px, 3vh, 40px);
            padding: clamp(14px, 2.5vh, 28px) 0 clamp(24px, 4vh, 56px);
            padding-bottom: clamp(24px, 4vh, 56px);
            box-sizing: border-box;
          }

          /* minmax(0, ...) lets a track shrink below its content, so long nowrap titles can't widen the column and push the page sideways. */
          .pulse-dash-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, 1fr);
            gap: clamp(14px, 1.6vw, 28px);
            align-items: stretch;
          }
          .pulse-dash-grid > * { min-width: 0; }
          @media (max-width: 1000px) {
            .pulse-dash-grid { grid-template-columns: minmax(0, 1fr); }
            .pulse-hero-panel { order: 1; }
            .pulse-dash-report { order: 2; }
            .pulse-dash-modules { order: 3; }
          }

          .pulse-report-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .pulse-report-grid > * { min-width: 0; }
          .pulse-tools-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: clamp(10px, 1.2vw, 18px);
          }
          .pulse-tools-grid > * { min-width: 0; }
          @media (max-width: 720px) {
            .pulse-tools-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }

          .pulse-hero-panel {
            min-height: clamp(150px, 36vw, 340px);
          }
          .pulse-hero-inner {
            width: 100%;
            transform: translateY(8%);
          }
          @media (max-width: 1000px) {
            .pulse-hero-inner { transform: translateY(0); }
          }
          @media (max-width: 640px) {
            .pulse-hero-panel { min-height: clamp(120px, 48vw, 230px); }
          }

          @media (max-width: 640px) {
            .pulse-fold { gap: 12px; padding-top: 0; }
            .pulse-report-grid { gap: 8px; }
            .pulse-hero-panel { margin-top: -30px; min-height: clamp(90px, 38vw, 190px); }
          }
        `}</style>

        <div style={{ height: 'calc(76px + env(safe-area-inset-top, 0px))' }} />

        <div className="pulse-fold">
          {modulesError && <div className="pulse-wide"><ErrorBanner /></div>}

          <motion.div className="pulse-wide"
            initial={playEntrance ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: NOTIFY_DELAY }}
          >
            <NotifyPermissionButton dark={dark} label="Enable exam & deadline reminders" />
            <GuestSignInButton dark={dark} />
          </motion.div>

          <div className="pulse-wide">
            <div className="pulse-dash-grid">
              <div className="pulse-dash-report" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <LiquidGlassCard dark={dark} delay={msFor(WEEKLY_REPORT_START)} instant={!playEntrance} style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <WeeklyReportIcon color={pt.text} size={16} />
                    <div style={{ ...pulseType.sectionLabel, fontSize: 16, color: pt.text }}>
                      Weekly Report
                    </div>
                  </div>
                  {reportLoading && <ReportGridSkeleton />}
                  <div className="pulse-report-grid" style={reportLoading ? { display: 'none' } : undefined}>
                    <div>
                      <div style={{
                        ...statNumStyle,
                        color: weeklyFeedback ? weeklyFeedback.color : pt.textPrimary
                      }}>
                        {weeklySummary ? (
                          <>
                            {playEntrance
                              ? <NumberTicker value={weeklySummary.accuracy} delay={tickerDelay} />
                              : weeklySummary.accuracy}%
                          </>
                        ) : '—'}
                      </div>
                      <div style={{ ...pulseType.small, color: pt.textSecondary, marginTop: 4 }}>
                        {weeklySummary ? 'Accuracy this week' : 'No questions logged this week'}
                      </div>
                      {weeklyFeedback && (
                        <div style={{
                          display: 'inline-block', marginTop: 6,
                          background: `${weeklyFeedback.color}18`, border: `1px solid ${weeklyFeedback.color}40`,
                          color: weeklyFeedback.color, borderRadius: 999, padding: '2px 10px',
                          fontSize: 11, fontWeight: 700
                        }}>{weeklyFeedback.label}</div>
                      )}
                    </div>
                    <div>
                      <div style={{ ...statNumStyle, color: pt.textPrimary }}>
                        {playEntrance
                          ? <NumberTicker value={weeklySummary ? weeklySummary.totalAttempted : 0} delay={tickerDelay + 0.15} />
                          : (weeklySummary ? weeklySummary.totalAttempted : 0)}
                      </div>
                      <div style={{ ...pulseType.small, color: pt.textSecondary, marginTop: 4 }}>Questions attempted</div>
                    </div>
                    <div>
                      <div style={{ ...pulseType.cardTitle, fontSize: 15, color: pt.indigo }}>
                        {weeklySummary?.topSubjectName || '—'}
                      </div>
                      <div style={{ ...pulseType.small, fontSize: 11, color: pt.textMuted, marginTop: 4 }}>Most practiced</div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: pt.terracotta }}>
                        <StreakFlameIcon size={16} />
                        <span style={{ ...pulseType.display, fontSize: 22, lineHeight: 1 }}>
                          {playEntrance
                            ? <NumberTicker value={streak} delay={tickerDelay + 0.3} />
                            : streak}
                        </span>
                      </div>
                      <div style={{ ...pulseType.small, fontSize: 11, color: pt.textMuted, marginTop: 4 }}>Day streak</div>
                    </div>
                  </div>
                </LiquidGlassCard>

                {renderNotices()}
              </div>

              <motion.div className="pulse-hero-panel"
                initial={playEntrance ? { opacity: 0, scale: 0.85 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.85, delay: HERO_DELAY }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <div className="pulse-hero-inner">
                  <EcgHero height={400} dark={dark} />
                </div>
              </motion.div>

              <div className="pulse-dash-modules">
                <motion.div
                  initial={playEntrance ? { opacity: 0, y: 16 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: ACTIVE_MODULES_START }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: pt.cobalt, marginBottom: 14, ...pulseType.sectionLabel }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: pt.cobalt, display: 'inline-block' }} />
                  Active Modules
                </motion.div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {!modulesLoaded && (
                    <motion.div
                      initial={playEntrance ? { opacity: 0, y: 16 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: remainingFor(ACTIVE_MODULES_START) }}
                    >
                      <CardRowsSkeleton count={2} pill label="Loading modules" />
                    </motion.div>
                  )}
                  {modulesLoaded && activeModules.length === 0 && (
                    <motion.div
                      initial={playEntrance ? { opacity: 0, y: 16 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: remainingFor(ACTIVE_MODULES_START) }}
                      style={{ ...pulseType.body, color: pt.textSecondary }}
                    >No active modules yet.</motion.div>
                  )}
                  {activeModules.map((mod, i) => {
                    const entrance = cardEntrance(ACTIVE_MODULES_START + i * 0.165)
                    // The module's own color, adjusted so the icon and dot stay readable in the current mode.
                    const modColor = adaptColor(mod.color, dark)
                    return (
                      <LiquidGlassCard key={mod.id} dark={dark} delay={entrance.delay} instant={entrance.instant}
                        onClick={() => navigate(`/module/${mod.id}`)}
                        style={{ borderRadius: 999, padding: '10px 18px 10px 10px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                          background: `${modColor}22`, border: `1px solid ${modColor}55`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <ModuleIcon value={mod.icon} size={20} color={modColor} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>{mod.name}</div>
                          <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{moduleBlurb(mod.name)}</div>
                        </div>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: modColor, display: 'inline-block', flexShrink: 0 }} />
                      </LiquidGlassCard>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="pulse-wide" style={{ marginTop: 'clamp(8px, 2vh, 24px)' }}>
            {sectionTitle('Tools', TOOLS_START, LightningIcon, true)}
            <div className="pulse-tools-grid">
              {toolCards.map((card, i) => {
                const accentColor = card.accent === 'amber' ? pt.amber : pt.indigo
                const Icon = card.Icon
                return (
                  <LiquidGlassCard key={i} dark={dark} delay={msFor(TOOLS_START) + i * 110} instant={!playEntrance}
                    onClick={() => navigate(card.to)}
                    style={{ borderRadius: 22, padding: '18px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                        background: `${accentColor}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Icon color={accentColor} size={19} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ ...pulseType.cardTitle, fontSize: 13, color: pt.textPrimary }}>{card.title}</div>
                        <div style={{ ...pulseType.small, fontSize: 11, color: pt.textMuted, marginTop: 1 }}>{card.sub}</div>
                      </div>
                    </div>
                    <div style={{ color: pt.textMuted, fontSize: 16, flexShrink: 0 }}>→</div>
                  </LiquidGlassCard>
                )
              })}
            </div>
          </div>

          <motion.div className="pulse-wide"
            initial={playEntrance ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: FOOTER_DELAY }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}
          >
            <div style={{ height: 1, background: pt.border, flex: 1, maxWidth: 120 }} />
            <div style={{ ...pulseType.small, display: 'flex', alignItems: 'center', gap: 8, color: ON_BACKGROUND.muted }}>
              <img src="/icon-192.png" alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }} />
              Keep the pulse. Shape the future.
            </div>
            <div style={{ height: 1, background: pt.border, flex: 1, maxWidth: 120 }} />
          </motion.div>
        </div>

        {completedModules.length > 0 && (() => {
          const completedEntrance = cardEntrance(COMPLETED_MODULES_START)
          return (
            <div className="pulse-wide" style={{ paddingBottom: 40 }}>
              <div style={{ maxWidth: 640, margin: '0 auto' }}>
                <motion.div
                  initial={playEntrance ? { opacity: 0, y: 20 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: remainingFor(COMPLETED_MODULES_START) }}
                  style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}
                >
                  <LiquidGlassCard
                    dark={dark}
                    delay={completedEntrance.delay}
                    instant={completedEntrance.instant}
                    style={{ padding: '10px 22px', borderRadius: 999 }}
                  >
                    <button
                      onClick={() => setArchiveOpen(o => !o)}
                      aria-expanded={archiveOpen}
                      aria-label={archiveOpen ? 'Collapse completed modules' : 'Expand completed modules'}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                        ...pulseType.sectionLabel, color: pt.textSecondary,
                      }}
                    >
                      ✓ Completed Modules
                      <span style={{
                        background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                        border: `1px solid ${pt.border}`,
                        borderRadius: 999, padding: '1px 8px', fontSize: 10, fontWeight: 700,
                        color: pt.textMuted,
                      }}>{completedModules.length}</span>
                      <motion.span
                        animate={{ rotate: archiveOpen ? 180 : 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        style={{ display: 'inline-flex' }}
                      >
                        <ChevronDown size={14} color={pt.textSecondary} />
                      </motion.span>
                    </button>
                  </LiquidGlassCard>
                </motion.div>

                <AnimatePresence initial={false}>
                  {archiveOpen && (
                    <motion.div
                      key="completed-modules-list"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      onAnimationComplete={() => setArchiveOverflowVisible(true)}
                      style={{ overflow: archiveOverflowVisible ? 'visible' : 'hidden' }}
                    >
                      <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}
                      >
                        {completedModules.map((mod) => (
                          <motion.div
                            key={mod.id}
                            variants={{
                              hidden: { opacity: 0, y: 14 },
                              visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }
                            }}
                          >
                            <LiquidGlassCard dark={dark} delay={0} instant
                              onClick={() => navigate(`/module/${mod.id}`)}
                              style={{
                                borderRadius: 999, padding: '10px 18px 10px 10px',
                                display: 'flex', alignItems: 'center', gap: 14, opacity: 0.85,
                              }}>
                              <div style={{
                                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                                background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                filter: 'grayscale(0.6)',
                              }}>
                                <ModuleIcon value={mod.icon} size={20} color={pt.textMuted} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  ...pulseType.cardTitle, color: pt.textSecondary,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>{mod.name}</div>
                              </div>
                              <span aria-label="Completed" style={{
                                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                border: `1px solid ${pt.border}`,
                              }}>
                                <CheckCircleIcon color={pt.textMuted} size={12} />
                              </span>
                            </LiquidGlassCard>
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
