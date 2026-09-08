// src/pages/Home.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useAuth, useModules } from '../contexts'
import NavMenu from '../components/NavMenu'
import { getPulseTheme, pulseFonts, pulseType, ON_GRADIENT_TOP, ON_GRADIENT_BOTTOM } from '../premiumTheme'
import { supabase } from '../supabase'
import ErrorBanner from '../components/ErrorBanner'
import { computeStreak } from '../lib/streak'
import { getGuestHistory } from '../lib/reviewStorage'
import { loadSavedActiveExam } from '../lib/activeExam'
import { ENTRANCE_PAUSE } from '../lib/pulseMotion'
import { useOncePerSession } from '../lib/useOncePerSession'
import NotifyPermissionButton from '../components/NotifyPermissionButton'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import EcgHero from '../components/pulse/EcgHero'
import PulseBackground from '../components/pulse/PulseBackground'
import PulseBrand from '../components/pulse/PulseBrand'
import { ScheduleIcon, ChecklistIcon, AnonQAIcon, LeaderboardIcon, PauseIcon, LightningIcon } from '@/components/ui/tool-icons'
import { ModuleIcon } from '../lib/medicalIcons'
import { accuracyTier, accuracyColor, type AccuracyTier } from './mcq/mcqShared'

interface HomeModule {
  id: string; name: string; icon?: string | null; color: string; status: 'active' | 'completed'
}

const toolCards = [
  { Icon: ScheduleIcon, title: 'Schedules', sub: 'Plan your study time', to: '/schedule', accent: 'indigo' },
  { Icon: ChecklistIcon, title: 'Checklist', sub: 'Track your progress', to: '/checklist', accent: 'amber' },
  { Icon: AnonQAIcon, title: 'Anonymous Q&A', sub: 'Ask. Learn. Grow.', to: '/anon-questions', accent: 'indigo' },
  { Icon: LeaderboardIcon, title: 'Leaderboard', sub: 'See where you stand', to: '/profile?tab=leaderboard', accent: 'amber' },
] as const

// ── Fixed accents for text/marks rendered directly on PULSE_BG ─────
// These two live outside any LiquidGlassCard/PulseGlassRow, sitting
// straight on the gradient — so per the same rule that governs
// ON_GRADIENT_TOP/ON_GRADIENT_BOTTOM, they must not silently swap
// shade just because the app's Light/Dark toggle changes. A plain
// `pt.cobalt`/`pt.textMuted` read here would do exactly that, since
// those are Liquid Glass tokens meant for glass surfaces.
//
// "Active Modules" sits in the gradient's pale/light top zone in both
// themes — frozen to the LIGHT-mode cobalt shade (the darker, more
// saturated blue), since the brighter dark-mode cyan reads oddly
// against that same pale top once the background stops changing with
// the toggle.
const ACTIVE_MODULES_ACCENT = getPulseTheme(false).cobalt

// The "Keep the pulse. Shape the future." footer sits in the
// gradient's dark/bottom zone in both themes (see ON_GRADIENT_BOTTOM
// above it), so its two flanking divider lines must stay fixed too —
// previously they read `pt.border`, a Liquid Glass token that changes
// between the light and dark app themes even though this text/its
// dividers never move off the same dark gradient zone. Frozen to the
// DARK-mode border value per the request to "use the dark one."
const FOOTER_LINE_COLOR = getPulseTheme(true).border

const MODULE_BLURBS: Record<string, string> = {
  neuro: 'Explore the wonders of the nervous system',
  cardio: 'Understand the heart and blood vessels',
  respirat: 'Study the mechanics of breathing',
  digest: 'Learn the process of nourishment',
  gastro: 'Learn the process of nourishment',
}
function moduleBlurb(name: string) {
  const key = Object.keys(MODULE_BLURBS).find(k => name.toLowerCase().includes(k))
  return key ? MODULE_BLURBS[key] : 'Master the essentials of this module.'
}

// ── Weekly Report accuracy feedback ─────────────────────────────────
// A short, warm one-liner reflecting this week's accuracy — the same
// tiered-feedback idea already used on the MCQ results screen
// (EXCELLENT / GREAT WORK / GOOD WORK / KEEP PRACTICING, see
// MCQExamFlow.tsx), adapted for this card's tone: sentence case rather
// than all-caps, phrased as encouragement rather than a verdict, since
// this is a standing weekly dashboard a student sees every time they
// open the app — not a one-off exam result. Tiers and colors come from
// accuracyTier/accuracyColor in mcqShared.tsx — the same single source
// of truth used by the MCQ results screen and mirrored server-side by
// the weekly push notification (api/push/weekly-report.js) — so all
// three surfaces always agree.
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

// ── Custom line-art icons for the Weekly Report card ────────────────
// Drawn in the same convention as src/components/ui/tool-icons.tsx
// (thin ~1.6-1.8px rounded strokes) — replaces the plain 📊 and 🔥
// emoji with purpose-built glyphs instead.

function WeeklyReportIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 9.5l4.5-3.5 4.5 2.5L19 3"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <path d="M4 20v-6.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.5 20V11" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 20v-9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 20V6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function StreakFlameIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21c4.2 0 7-2.9 7-6.8 0-3-1.9-4.8-3-7.6-.9 2.6-2.7 2.8-2.7 5.3 0-2.8-1.9-4.6-.9-7.4C9.5 6.3 7 9.7 7 13.4 7 17.6 9.4 21 12 21Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M12 21c1.7 0 3-1.3 3-3.1 0-1.6-1.1-2.5-1.6-3.6-.5 1.1-1.4 1.3-1.4 2.6 0-1.3-.9-2-.6-3.3-1.5 1-2.4 2.7-2.4 4.3 0 1.8 1.3 3.1 3 3.1Z"
        fill={color}
        opacity="0.35"
      />
    </svg>
  )
}

// Major dashboard-number style (weekly accuracy %, questions attempted,
// streak) — sourced from the shared typography hierarchy, scaled down
// from the full `display` size since these sit inside compact stat
// tiles rather than as a page hero number.
const statNumStyle = { ...pulseType.display, fontSize: 28, lineHeight: 1.1 }

// ── Reveal order ───────────────────────────────────────────────────
const HERO_DELAY = ENTRANCE_PAUSE
const LOGO_DELAY = ENTRANCE_PAUSE + 0.5
const NOTIFY_DELAY = LOGO_DELAY + 0.3
const WEEKLY_REPORT_START = LOGO_DELAY + 0.6
const ACTIVE_MODULES_START = WEEKLY_REPORT_START + 0.6
const TOOLS_START = ACTIVE_MODULES_START + 0.6
const FOOTER_DELAY = TOOLS_START + 0.5
const COMPLETED_MODULES_START = TOOLS_START + 0.6

function msFor(targetSeconds: number) {
  return Math.round(((targetSeconds - ENTRANCE_PAUSE) / 1.5) * 1000)
}

// ── Brand block timeline ──────────────────────────────────────────
const BRAND_WORDS_START = LOGO_DELAY + 0.45
const BRAND_WORD_STAGGER = 0.2
const BRAND_TAGLINE_DELAY = BRAND_WORDS_START + BRAND_WORD_STAGGER * 2 + 0.2

interface WeeklySummary { totalAttempted: number; accuracy: number; topSubjectName: string | null }

export default function Home({ dark, toggleTheme }: { dark: boolean; toggleTheme: () => void }) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const { user, profile } = useAuth() as any
  const { modules, modulesLoaded, modulesError } = useModules() as { modules: HomeModule[]; modulesLoaded: boolean; modulesError: boolean }
  const [announcement, setAnnouncement] = useState('')
  const [streak, setStreak] = useState(0)
  const [pausedExam, setPausedExam] = useState<any>(null)
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null)

  // Collapsible disclosure for Completed Modules — collapsed by
  // default so finished modules don't compete visually with active
  // ones, but presented as the same pill-card treatment as Active
  // Modules (just muted) rather than a flat row-list, per feedback.
  const [archiveOpen, setArchiveOpen] = useState(false)

  // Tracks whether the expand/collapse height animation has finished.
  // The wrapping motion.div needs `overflow: hidden` WHILE it's
  // animating height (0 -> auto), but hidden overflow also clips each
  // card's own hover scale-up effect once the list is fully open —
  // that's what made completed-module cards look "cut off" on hover.
  // Switching to `overflow: visible` only after the height animation
  // completes keeps the collapse/expand working while letting hover
  // effects breathe once the list is settled.
  const [archiveOverflowVisible, setArchiveOverflowVisible] = useState(false)

  useEffect(() => {
    if (!archiveOpen) setArchiveOverflowVisible(false)
  }, [archiveOpen])

  // True only the first time Home mounts in this browser tab session
  // (survives reloads, resets when the tab closes). The full
  // staggered entrance plays once; navigating back to Home afterward
  // in the same tab renders everything instantly in its final state.
  const playEntrance = useOncePerSession('znu_home_entrance_played')

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', 'home_announcement').single()
      .then(({ data }) => { if (data?.value) setAnnouncement(data.value) })
  }, [])

  // AUDIT FIX: streak and the weekly accuracy/total-attempted summary
  // used to each run their own independent supabase.from('exam_history')
  // query for signed-in users — two round trips to the same table on
  // every single Home load, one unfiltered (streak needs the
  // student's FULL history, since a streak can span more than a
  // week) and one filtered to the last 7 days (weekly summary). Both
  // only ever need completed_at/total/correct/subject_id, so one
  // unfiltered fetch now serves both: streak is computed from every
  // row's completed_at, and the weekly summary is computed by
  // filtering that same already-fetched result set to the last 7 days
  // client-side, instead of asking the database for overlapping data
  // twice. The guest (no-account) path was never actually duplicated
  // — getGuestHistory() reads a local array from localStorage, not
  // the network — so it's left exactly as it was, just now computed
  // inside the same effect as the signed-in path for symmetry.
  useEffect(() => {
    async function loadStreakAndWeeklySummary() {
      const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000

      let rows: any[]
      if (user) {
        const { data } = await supabase
          .from('exam_history')
          .select('completed_at, total, correct, subject_id')
          .eq('user_id', user.id)
        rows = data || []
      } else {
        rows = getGuestHistory()
      }

      setStreak(computeStreak(rows.map((r: any) => r.completed_at)))

      const weeklyRows = rows.filter((r: any) => {
        const ts = typeof r.completed_at === 'number' ? r.completed_at : new Date(r.completed_at).getTime()
        return ts >= weekAgoMs
      })

      if (weeklyRows.length === 0) { setWeeklySummary(null); return }

      const totalAttempted = weeklyRows.reduce((a, h) => a + h.total, 0)
      const totalCorrect = weeklyRows.reduce((a, h) => a + h.correct, 0)
      const accuracy = totalAttempted > 0 ? Math.round((100 * totalCorrect) / totalAttempted) : 0

      const bySubject: Record<string, number> = {}
      weeklyRows.forEach(h => { if (h.subject_id) bySubject[h.subject_id] = (bySubject[h.subject_id] || 0) + h.total })
      const topSubjectId = Object.entries(bySubject).sort((a, b) => b[1] - a[1])[0]?.[0] || null

      let topSubjectName: string | null = null
      if (topSubjectId) {
        const { data: subData } = await supabase.from('subjects').select('name').eq('id', topSubjectId).single()
        topSubjectName = subData?.name || null
      }

      setWeeklySummary({ totalAttempted, accuracy, topSubjectName })
    }
    loadStreakAndWeeklySummary()
  }, [user])

  useEffect(() => {
    loadSavedActiveExam(user).then(setPausedExam)
  }, [user])

  // AUDIT FIX (H1): a client-side `checkExamReminders()` effect used to
  // live here, firing an in-tab `new Notification(...)` for exams
  // within 2 days whenever Home mounted (deduped once per calendar day
  // via a localStorage flag). That duplicated
  // api/push/exam-reminders.js, which already runs daily via GitHub
  // Actions (.github/workflows/exam-reminders-push.yml) and delivers a
  // real Web Push notification — including when the app isn't open at
  // all, which the client-side version could never do anyway. A
  // student with push enabled who also opened Home on reminder day
  // could receive the same reminder twice, from two different code
  // paths with two different dedup keys. The server-side cron is now
  // the single source of truth for exam reminders; this effect has
  // been removed rather than left to fire alongside it.

  const activeModules = modules.filter(m => m.status === 'active')
  const completedModules = modules.filter(m => m.status === 'completed')

  // Section eyebrow labels ("Tools", "✓ Completed Modules") — these
  // render directly on PulseBackground (outside any LiquidGlassCard),
  // so they must use the gradient-zone tokens (ON_GRADIENT_TOP /
  // ON_GRADIENT_BOTTOM), never the Glass tokens (pt.textMuted).
  //
  // AUDIT FIX: both headings used to read the Glass token
  // `pt.textMuted` even though neither sits on a glass surface. Which
  // gradient zone applies depends on where the section actually sits
  // on the page: "Tools" is still within the first fold (light/top
  // zone), while "✓ Completed Modules" only appears after scrolling
  // well past the fold, into the gradient's dark lower zone — the
  // same reasoning Footer.jsx already documents for its own text
  // color. `zone` lets each call site pick the correct one instead of
  // both sharing one Glass-token color regardless of position.
  //
  // AUDIT FIX (contrast): both headings previously always used the
  // `muted` (62%-opacity) tone regardless of context, which read too
  // faint sitting directly on the gradient. `strong` lets a call site
  // opt into the near-full-opacity `secondary` tone instead, without
  // touching any other caller of this helper.
  const sectionTitle = (
    text: string,
    delaySeconds: number,
    zone: 'top' | 'bottom' = 'top',
    Icon?: (p: { color: string; size?: number }) => JSX.Element,
    strong: boolean = false
  ) => {
    const color = zone === 'bottom'
      ? (strong ? ON_GRADIENT_BOTTOM.secondary : ON_GRADIENT_BOTTOM.muted)
      : (strong ? ON_GRADIENT_TOP.secondary : ON_GRADIENT_TOP.muted)
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
    <div style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden' }}>
      <PulseBackground />

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 500,
        pointerEvents: 'none',
      }}>
        <div className="pulse-wide" style={{
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          paddingBottom: 16,
          pointerEvents: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <PulseBrand
              dark={dark}
              instant={!playEntrance}
              animation={{
                logoDelay: LOGO_DELAY,
                wordsStart: BRAND_WORDS_START,
                wordStagger: BRAND_WORD_STAGGER,
                taglineDelay: BRAND_TAGLINE_DELAY,
              }}
            />

            <motion.div
              initial={playEntrance ? { opacity: 0, x: 20 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: LOGO_DELAY }}
            >
              <NavMenu dark={dark} toggleTheme={toggleTheme} align="right" />
            </motion.div>
          </div>
        </div>
      </div>

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
            padding-bottom: max(clamp(24px, 4vh, 56px), env(safe-area-inset-bottom));
            box-sizing: border-box;
          }

          .pulse-dash-grid {
            display: grid;
            grid-template-columns: 1fr 1.3fr 1fr;
            gap: clamp(14px, 1.6vw, 28px);
            align-items: stretch;
          }
          @media (max-width: 1000px) {
            .pulse-dash-grid { grid-template-columns: 1fr; }
          }
          .pulse-report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .pulse-tools-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: clamp(10px, 1.2vw, 18px);
          }
          @media (max-width: 720px) {
            .pulse-tools-grid { grid-template-columns: repeat(2, 1fr); }
          }

          .pulse-hero-panel {
            min-height: clamp(130px, 34vw, 320px);
          }
          @media (max-width: 640px) {
            .pulse-hero-panel { min-height: clamp(110px, 46vw, 220px); }
          }

          @media (max-width: 640px) {
            .pulse-fold { gap: 14px; }
            .pulse-report-grid { gap: 8px; }
          }
        `}</style>

        <div style={{ height: 'calc(76px + env(safe-area-inset-top))' }} />

        <div className="pulse-fold">
          {modulesError && <div className="pulse-wide"><ErrorBanner /></div>}

          <motion.div className="pulse-wide"
            initial={playEntrance ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: NOTIFY_DELAY }}
          >
            <NotifyPermissionButton dark={dark} label="Enable exam & deadline reminders" />
          </motion.div>

          <div className="pulse-wide">
            <div className="pulse-dash-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <LiquidGlassCard dark={dark} delay={msFor(WEEKLY_REPORT_START)} instant={!playEntrance} style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <WeeklyReportIcon color={pt.text} size={16} />
                    <div style={{ ...pulseType.sectionLabel, fontSize: 16, color: pt.text }}>
                      Weekly Report
                    </div>
                  </div>
                  <div className="pulse-report-grid">
                    <div>
                      <div style={{
                        ...statNumStyle,
                        color: weeklyFeedback ? weeklyFeedback.color : pt.textPrimary
                      }}>
                        {weeklySummary ? `${weeklySummary.accuracy}%` : '—'}
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
                      <div style={{ ...statNumStyle, color: pt.textPrimary }}>{weeklySummary ? weeklySummary.totalAttempted : 0}</div>
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
                        <StreakFlameIcon color={pt.terracotta} size={16} />
                        <span style={{ ...pulseType.display, fontSize: 22, lineHeight: 1 }}>{streak}</span>
                      </div>
                      <div style={{ ...pulseType.small, fontSize: 11, color: pt.textMuted, marginTop: 4 }}>Day streak</div>
                    </div>
                  </div>
                </LiquidGlassCard>

                {(pausedExam || announcement) && (
                  <LiquidGlassCard dark={dark} delay={msFor(WEEKLY_REPORT_START) + 200} instant={!playEntrance}
                    onClick={pausedExam ? () => navigate('/mcq') : undefined}
                    style={{ padding: '16px 20px' }}>
                    {pausedExam ? (
                      <div style={{ ...pulseType.cardTitle, fontSize: 14, color: pt.cobalt, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PauseIcon color={pt.cobalt} size={13} /> Continue where you left off →
                      </div>
                    ) : (
                      <div style={{ ...pulseType.bodyEmphasis, fontSize: 13, color: pt.textPrimary, lineHeight: 1.5 }}>
                        {announcement}
                      </div>
                    )}
                  </LiquidGlassCard>
                )}
              </div>

              <motion.div className="pulse-hero-panel"
                initial={playEntrance ? { opacity: 0, scale: 0.85 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.85, delay: HERO_DELAY }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <div style={{ transform: 'translateY(8%)', width: '100%' }}>
                  <EcgHero height={400} />
                </div>
              </motion.div>

              <div>
                <motion.div
                  initial={playEntrance ? { opacity: 0, y: 16 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: ACTIVE_MODULES_START }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, color: ACTIVE_MODULES_ACCENT, marginBottom: 14, ...pulseType.sectionLabel }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACTIVE_MODULES_ACCENT, display: 'inline-block' }} />
                  Active Modules
                </motion.div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {modulesLoaded && activeModules.length === 0 && (
                    <motion.div
                      initial={playEntrance ? { opacity: 0, y: 16 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: ACTIVE_MODULES_START }}
                      style={{ ...pulseType.body, color: pt.textSecondary }}
                    >No active modules yet.</motion.div>
                  )}
                  {activeModules.map((mod, i) => (
                    <LiquidGlassCard key={mod.id} dark={dark} delay={msFor(ACTIVE_MODULES_START) + i * 110} instant={!playEntrance}
                      onClick={() => navigate(`/module/${mod.id}`)}
                      style={{ borderRadius: 999, padding: '10px 18px 10px 10px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                        background: `${mod.color}22`, border: `1px solid ${mod.color}55`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <ModuleIcon value={mod.icon} size={20} color={mod.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...pulseType.cardTitle, color: pt.textPrimary }}>{mod.name}</div>
                        <div style={{ ...pulseType.small, color: pt.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{moduleBlurb(mod.name)}</div>
                      </div>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: mod.color, display: 'inline-block', flexShrink: 0 }} />
                    </LiquidGlassCard>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pulse-wide">
            {sectionTitle('Tools', TOOLS_START, 'top', LightningIcon, true)}
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
            <div style={{ height: 1, background: FOOTER_LINE_COLOR, flex: 1, maxWidth: 120 }} />
            <div style={{ ...pulseType.small, display: 'flex', alignItems: 'center', gap: 8, color: ON_GRADIENT_BOTTOM.muted }}>
              <img src="/icon-192.png" alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }} />
              Keep the pulse. Shape the future.
            </div>
            <div style={{ height: 1, background: FOOTER_LINE_COLOR, flex: 1, maxWidth: 120 }} />
          </motion.div>
        </div>

        {/* ── Completed Modules — collapsible, muted card treatment ───
            Same pill-shaped LiquidGlassCard used by Active Modules
            (so it still visually reads as "a card" in this app), just
            desaturated: grayscale icon circle, muted text, a
            "✓ Completed" tag instead of the colored active-dot. The
            whole list is collapsed by default (finished modules are
            lower priority than active ones) with a chevron + count
            badge as the expand affordance, and the expand/collapse is
            animated via AnimatePresence rather than an instant
            show/hide. The section is capped to 640px and centered so
            it doesn't stretch edge-to-edge on wide desktop screens. */}
        {completedModules.length > 0 && (
          <div className="pulse-wide" style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <motion.button
                onClick={() => setArchiveOpen(o => !o)}
                initial={playEntrance ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: COMPLETED_MODULES_START }}
                aria-expanded={archiveOpen}
                aria-label={archiveOpen ? 'Collapse completed modules' : 'Expand completed modules'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                  marginBottom: 16, ...pulseType.sectionLabel, color: ON_GRADIENT_BOTTOM.secondary,
                }}
              >
                ✓ Completed Modules
                <span style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: `1px solid ${ON_GRADIENT_BOTTOM.muted}55`,
                  borderRadius: 999, padding: '1px 8px', fontSize: 10, fontWeight: 700,
                  color: ON_GRADIENT_BOTTOM.muted,
                }}>{completedModules.length}</span>
                <motion.span
                  animate={{ rotate: archiveOpen ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  style={{ marginLeft: 'auto', display: 'inline-flex' }}
                >
                  <ChevronDown size={14} color={ON_GRADIENT_BOTTOM.secondary} />
                </motion.span>
              </motion.button>

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
                            <span style={{
                              fontSize: 10, fontWeight: 700, color: pt.textMuted,
                              background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                              border: `1px solid ${pt.border}`, borderRadius: 999,
                              padding: '2px 10px', flexShrink: 0, whiteSpace: 'nowrap',
                            }}>✓ Completed</span>
                          </LiquidGlassCard>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
