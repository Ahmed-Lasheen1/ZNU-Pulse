import { PeopleIcon, BookIcon, FlaskIcon, FlagCheckeredIcon, PinIcon } from '../components/ui/tool-icons'

// Single source of truth for exam-stage metadata (title, icon, color).
// Used for ModulePage/StagePage cards, MCQ/Summaries filter tabs, and
// Admin dropdowns.
//
// `Icon` is the real component used almost everywhere. `emoji` is only
// a fallback for the admin Stages-editor text field, which has no way
// to show a React icon — without it that field (and any row saved
// from it) ends up with an empty icon.
export const EXAM_STAGES = [
  { value: 'tbl', title: 'TBL', Icon: PeopleIcon, emoji: '👥', color: '#a78bfa' },
  { value: 'end_module', title: 'End Module', Icon: BookIcon, emoji: '📘', color: '#38bdf8' },
  { value: 'practical', title: 'Practical', Icon: FlaskIcon, emoji: '🧪', color: '#f59e0b' },
  { value: 'final', title: 'Final', Icon: FlagCheckeredIcon, emoji: '🏁', color: '#f472b6' },
]

// Fallback for unrecognized stage values.
export const FALLBACK_STAGE = { value: 'general', title: 'General', Icon: PinIcon, emoji: '📌', color: '#64748b' }

export function stageMeta(value) {
  return EXAM_STAGES.find(s => s.value === value) || FALLBACK_STAGE
}
