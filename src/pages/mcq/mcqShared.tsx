// src/pages/mcq/mcqShared.tsx
// Small constants, colors, and presentational atoms shared between
// MCQ.tsx (state/logic container), MCQBrowse.tsx (module/subject
// browsing view) and MCQExamFlow.tsx (taking + results + review).
// Split out purely so MCQ.tsx doesn't keep growing — no behavior
// changes from the original single-file version.
import { pulseFonts, ON_GRADIENT_TOP, ON_GRADIENT_BOTTOM } from '../../premiumTheme'

export const MOCK_MINUTES = 36
// Existing functional accent for the MCQ/exam feature (same terracotta
// used on Review.tsx) — reused, not invented.
export const MCQ_ACCENT = '#e2725b'

// ── Shared accuracy tiers ────────────────────────────────────────────
// Single source of truth for the score bands used everywhere accuracy
// gets a color or a verdict: the MCQ results screen (EXCELLENT./GREAT
// WORK./etc in MCQExamFlow.tsx), the per-subject accuracy bars, and
// the Home page's Weekly Report card (see weeklyAccuracyFeedback in
// Home.tsx) and the weekly push notification (api/push/weekly-report.js
// mirrors these same breakpoints server-side). Keeping the breakpoints
// in one place means changing them only ever needs to happen here.
export type AccuracyTier = 'excellent' | 'great' | 'good' | 'keep_practicing' | 'needs_work'

export function accuracyTier(accuracy: number): AccuracyTier {
  if (accuracy >= 90) return 'excellent'
  if (accuracy >= 75) return 'great'
  if (accuracy >= 65) return 'good'
  if (accuracy >= 50) return 'keep_practicing'
  return 'needs_work'
}

export function accuracyColor(accuracy: number, pt: { success: string; cobalt: string; amber: string; danger: string }) {
  const tier = accuracyTier(accuracy)
  if (tier === 'excellent' || tier === 'great') return pt.success
  if (tier === 'good') return pt.cobalt
  if (tier === 'keep_practicing') return pt.amber
  return pt.danger
}

// ── Gradient-aware text colors ──────────────────────────────────────
// PulseBackground's gradient is fixed to the *viewport* (not the
// scrolled page) and always runs pale blue (top) → dark navy (bottom),
// in both themes. Anything rendered directly on it (not inside a
// LiquidGlassCard, which has its own backing) needs colors chosen for
// whichever zone it actually sits in, not the theme's usual card-text
// colors.
export const EXAM_TOP_TEXT = ON_GRADIENT_TOP.primary
export const EXAM_TOP_TEXT_MUTED = ON_GRADIENT_TOP.muted
export const EXAM_TOP_AMBER = '#b45309'
export const EXAM_TOP_RED = '#b91c1c'
export const EXAM_LOW_TEXT = ON_GRADIENT_BOTTOM.primary
export const EXAM_LOW_SECONDARY = ON_GRADIENT_BOTTOM.secondary
export const EXAM_LOW_TEXT_MUTED = ON_GRADIENT_BOTTOM.muted
export const EXAM_LOW_SHADOW = '0 1px 6px rgba(1,12,74,0.5)'
export const EXAM_DIVIDER = 'rgba(255,255,255,0.28)'

export const optionLabels = ['a', 'b', 'c', 'd']
export const optionTexts = (q: any) => [q.option_a, q.option_b, q.option_c, q.option_d]
export const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

// Small labeled number used on the results screen ("CORRECT 28",
// "INCORRECT 8", "TIME 31:42") — plain typography, no chart chrome.
// Lives in the lower/results zone, so it always carries the legibility
// shadow regardless of the color passed in for its accent.
export function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 22, color, textShadow: EXAM_LOW_SHADOW }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color, opacity: 0.75, marginTop: 2, textShadow: EXAM_LOW_SHADOW }}>{label}</div>
    </div>
  )
}

// Generic subject/lesson context tag, same pill treatment as
// QuestionSourceBadge — shown next to it based on how broad the
// current quiz is (see showSubjectTag/showLessonTag in MCQExamFlow).
export function InfoTag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${color}20`, border: `1px solid ${color}40`,
      color, borderRadius: 20, padding: '2px 10px',
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap'
    }}>{label}</span>
  )
}
