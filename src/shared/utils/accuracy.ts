// Accuracy percentage → tier and color, shared by the dashboard, quiz results and admin analytics.
export type AccuracyTier = 'excellent' | 'great' | 'good' | 'keep_practicing' | 'needs_work'

// Maps an accuracy percentage to a tier name.
export function accuracyTier(accuracy: number): AccuracyTier {
  if (accuracy >= 90) return 'excellent'
  if (accuracy >= 75) return 'great'
  if (accuracy >= 65) return 'good'
  if (accuracy >= 50) return 'keep_practicing'
  return 'needs_work'
}

// Picks the theme color for an accuracy percentage.
export function accuracyColor(accuracy: number, pt: { success: string; cobalt: string; amber: string; danger: string }) {
  const tier = accuracyTier(accuracy)
  if (tier === 'excellent' || tier === 'great') return pt.success
  if (tier === 'good') return pt.cobalt
  if (tier === 'keep_practicing') return pt.amber
  return pt.danger
}
