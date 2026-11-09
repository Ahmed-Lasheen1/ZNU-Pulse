import { NotesIcon, ExamIcon } from '@/shared/icons/medicalIcons'
import { FlashcardIcon } from '@/shared/icons/FlashcardIcon'
import { MCQ_ACCENT, FLASHCARD_ACCENT } from '@/shared/theme/accents'
import type { PulseTheme } from '@/shared/theme/types'
import type { PlanItem, PlanLinkKind } from '@/features/tools/schedule/types'

// Display order of the tools on a plan item.
export const PLAN_TOOL_ORDER: PlanLinkKind[] = ['summary', 'flashcards', 'practice']

// Label and icon of each tool, shared by the admin editor and the student plan card.
export const PLAN_TOOL_META: Record<PlanLinkKind, { label: string; Icon: (p: { color: string; size?: number }) => JSX.Element }> = {
  summary: { label: 'Summary', Icon: NotesIcon },
  flashcards: { label: 'Flashcards', Icon: FlashcardIcon },
  practice: { label: 'Practice', Icon: ExamIcon },
}

// Accent of each tool, matching the Study by Lesson buttons.
export function planToolColor(kind: PlanLinkKind, pt: PulseTheme) {
  if (kind === 'summary') return pt.success
  return kind === 'flashcards' ? FLASHCARD_ACCENT : MCQ_ACCENT
}

// Tools of an item in display order, including the one from legacy single-link items.
export function itemTools(item: PlanItem): PlanLinkKind[] {
  const saved = item.tools ?? (item.link ? [item.link.kind] : [])
  return PLAN_TOOL_ORDER.filter(kind => saved.includes(kind))
}

// Lesson an item points to, including the one from legacy single-link items.
export function itemLessonId(item: PlanItem): string | null {
  return item.lesson_id || item.link?.lesson_id || null
}
