// src/pages/mcq/mcqShared.tsx
// Shared constants/colors/atoms used by MCQ.tsx, MCQBrowse.tsx, MCQExamFlow.tsx.
import { pulseFonts, ON_GRADIENT_TOP, ON_GRADIENT_BOTTOM } from '../../premiumTheme'

// Existing MCQ/exam accent color (same terracotta as Review.tsx).
export const MCQ_ACCENT = '#e2725b'

// ── Accuracy tiers — shared by results screen, Home's Weekly Report, and the weekly push notification ──
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

// ── Gradient-aware text colors ──
// PulseBackground's gradient is fixed to the viewport; anything sitting
// directly on it (not inside a glass card) needs zone-specific colors.
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

// Small labeled number for the results screen ("CORRECT 28", "TIME 31:42").
export function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: pulseFonts.display, fontWeight: 800, fontSize: 22, color, textShadow: EXAM_LOW_SHADOW }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color, opacity: 0.75, marginTop: 2, textShadow: EXAM_LOW_SHADOW }}>{label}</div>
    </div>
  )
}

// Generic subject/lesson context tag — same pill as QuestionSourceBadge.
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
