import { PeopleIcon, BookIcon, FlaskIcon, FlagCheckeredIcon, PinIcon } from '../components/ui/tool-icons'

// Single source of truth for exam-stage metadata (title, icon, color).
// Used for the big cards on ModulePage/StagePage, the filter tabs on
// MCQ/Summaries, and the dropdowns in Admin — so the same icon/labels
// show up everywhere instead of colored bullet dots in some places.
//
// `Icon` replaces the old emoji field for these 4 built-in stages.
// Admin-defined custom per-module stages (see the module_exam_stages
// table / StagesTab.tsx) still store a plain admin-typed emoji/text
// string in their own `emoji` column — that's user-authored content,
// not a hardcoded app emoji, so it's untouched here. Every render site
// that consumes these stages falls back to that raw `emoji` string
// whenever a stage object has no `Icon` (i.e. it came from the DB,
// not this file).
export const EXAM_STAGES = [
  { value: 'tbl', title: 'TBL', Icon: PeopleIcon, color: '#a78bfa' },
  { value: 'end_module', title: 'End Module', Icon: BookIcon, color: '#38bdf8' },
  { value: 'practical', title: 'Practical', Icon: FlaskIcon, color: '#f59e0b' },
  { value: 'final', title: 'Final', Icon: FlagCheckeredIcon, color: '#f472b6' },
]

// Kept only as a safe fallback for any old/unrecognized stage value
// (e.g. content tagged 'general' before this list existed) — not shown
// as a selectable option anywhere.
export const FALLBACK_STAGE = { value: 'general', title: 'General', Icon: PinIcon, color: '#64748b' }

export function stageMeta(value) {
  return EXAM_STAGES.find(s => s.value === value) || FALLBACK_STAGE
}
