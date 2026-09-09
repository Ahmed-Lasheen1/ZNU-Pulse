import { motion } from "framer-motion"

interface IconProps {
  color: string
  size?: number
}

// Custom line-art icon set for the Home "Tools" cards — replaces the
// old emoji (📅 🎯 💬 🏆). Drawn as thin (1.6px) rounded strokes with
// no fill, matching the glass/premium aesthetic elsewhere on Home
// rather than borrowing a generic icon library's default weight/style.
// Each icon takes a live `color` prop (the card's accent) instead of
// being pre-baked to one color, and animates its accent stroke in on
// mount for a touch of the same "draw itself" character as the rest
// of the page's entrance choreography.

const drawTransition = { duration: 1, ease: [0.65, 0, 0.35, 1] as const }

export function ScheduleIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="16" rx="4" stroke={color} strokeWidth="1.6" opacity="0.9" />
      <path d="M8 3v4M16 3v4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3.5 10h17" stroke={color} strokeWidth="1.6" opacity="0.55" />
      <motion.path
        d="M8 15.5l2.4 2.2L16.5 12"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ ...drawTransition, delay: 0.15 }}
      />
    </svg>
  )
}

export function ChecklistIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.6" opacity="0.4" />
      <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.6" opacity="0.65" />
      <motion.circle
        cx="12" cy="12" r="1.7"
        fill={color}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      />
      <motion.path
        d="M12 12l6.5 -6.5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ ...drawTransition, delay: 0.1 }}
      />
    </svg>
  )
}

export function AnonQAIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-7Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <motion.path
        d="M9.6 8.8c0-1.3 1.05-2.3 2.4-2.3s2.4.9 2.4 2.1c0 1-.6 1.5-1.4 2-.7.45-1 .8-1 1.5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ ...drawTransition, delay: 0.15 }}
      />
      <motion.circle
        cx="12" cy="14.6" r="1"
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.9 }}
      />
    </svg>
  )
}

export function LeaderboardIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <motion.rect x="3.5" y="13" width="4.5" height="8" rx="1.2" fill={color} opacity="0.35"
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ originY: 1 }} transition={{ duration: 0.5, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }} />
      <motion.rect x="9.75" y="8" width="4.5" height="13" rx="1.2" fill={color} opacity="0.65"
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ originY: 1 }} transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }} />
      <motion.rect x="16" y="4.5" width="4.5" height="16.5" rx="1.2" fill={color}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ originY: 1 }} transition={{ duration: 0.5, delay: 0, ease: [0.34, 1.56, 0.64, 1] }} />
      <motion.path
        d="M18.25 1.5l.85 1.9 2 .25-1.5 1.4.4 2-1.75-1-1.75 1 .4-2-1.5-1.4 2-.25 .85-1.9Z"
        fill={color}
        initial={{ scale: 0, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.6, delay: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ transformOrigin: '18.25px 3.4px' }}
      />
    </svg>
  )
}

// ── Icons for ModulePage / StagePage section headers ────────────────
export function ExamStageIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" opacity="0.4" />
      <circle cx="12" cy="12" r="5.5" stroke={color} strokeWidth="1.6" opacity="0.7" />
      <motion.circle
        cx="12" cy="12" r="2.1"
        fill={color}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
      />
    </svg>
  )
}

export function StudyByLessonIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 6c-1.7-1.4-3.9-2.2-6.6-2.2-.5 0-.9.4-.9.9v12.6c0 .5.4.9.9.9 2.7 0 4.9.8 6.6 2.2"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <motion.path
        d="M12 6c1.7-1.4 3.9-2.2 6.6-2.2.5 0 .9.4.9.9v12.6c0 .5-.4.9-.9.9-2.7 0-4.9.8-6.6 2.2V6Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ ...drawTransition, delay: 0.15 }}
      />
    </svg>
  )
}

export function StudyMaterialsIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M3.5 6.6c0-.6.45-1.1 1-1.1h4.3c.3 0 .58.13.77.36l1.1 1.3c.19.23.47.36.77.36H19c.55 0 1 .5 1 1.1v9.2c0 .6-.45 1.1-1 1.1H4.5c-.55 0-1-.5-1-1.1V6.6Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <motion.path
        d="M3.5 9.8H20"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ ...drawTransition, delay: 0.15 }}
      />
    </svg>
  )
}

export function SmartSummariesIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 3.5h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" opacity="0.9" />
      <path d="M15 3.5V7.5a1 1 0 0 0 1 1h4" stroke={color} strokeWidth="1.6" strokeLinejoin="round" opacity="0.55" />
      <motion.path
        d="M8.5 12.3h7M8.5 15.3h7M8.5 18.3h4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ ...drawTransition, delay: 0.15 }}
      />
    </svg>
  )
}

export function PracticeIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9.5 2.5h5" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
      <path
        d="M10.3 2.5v6.1c0 .3-.08.6-.24.85L5.7 16.4A2.4 2.4 0 0 0 7.7 20.2h8.6a2.4 2.4 0 0 0 2-3.8l-4.36-7a1.7 1.7 0 0 1-.24-.85V2.5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path d="M8 14.2h8" stroke={color} strokeWidth="1.6" opacity="0.5" />
      <motion.path
        d="M10 17.4h4M11 18.9h2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ ...drawTransition, delay: 0.15 }}
      />
    </svg>
  )
}

export function HomeIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 10.5L12 4l8 6.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" stroke={color} strokeWidth="1.6" strokeLinejoin="round" opacity="0.55" />
      <motion.path
        d="M9.5 20V15a2.5 2.5 0 0 1 5 0v5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ ...drawTransition, delay: 0.15 }}
      />
    </svg>
  )
}

export function SignOutIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M15 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <motion.path
        d="M9 12h11M16 8l4 4-4 4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ ...drawTransition, delay: 0.15 }}
      />
    </svg>
  )
}

// ── Batch 1 additions — replacing common emoji across the app with
// the same thin-line-art convention as the icons above. Static (no
// draw-in animation) since these are used inline with text in lists,
// banners, and buttons rather than as page-entrance hero marks.

export function BellIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14.5 6 10.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function TrashIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4.5 7h15" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 10.5v6M14 10.5v6" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

export function ClockIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12.5" r="8.5" stroke={color} strokeWidth="1.6" />
      <path d="M12 7.5V12.5L15.5 15" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 2.5h5" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

export function WarningIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3.5l9.5 16.5H2.5L12 3.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 10v4.2" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1" fill={color} />
    </svg>
  )
}

export function CelebrationIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 20L15.5 9.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 20l2.2-6.8L15.5 9.5l4.3 1.9L14 17.6 5 20Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14.5 3.5l1 2M18.5 5.5l2 1M17 8.5l2.4-.6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function CalendarDotIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="16" rx="4" stroke={color} strokeWidth="1.6" opacity="0.85" />
      <path d="M8 3v4M16 3v4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3.5 10h17" stroke={color} strokeWidth="1.6" opacity="0.5" />
      <circle cx="12" cy="15" r="1.6" fill={color} />
    </svg>
  )
}

export function TargetIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" opacity="0.4" />
      <circle cx="12" cy="12" r="5.5" stroke={color} strokeWidth="1.6" opacity="0.7" />
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  )
}

export function BookIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 5.2c2.2-1.1 4.6-1.1 7 0v14c-2.4-1.1-4.8-1.1-7 0V5.2Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M20 5.2c-2.2-1.1-4.6-1.1-7 0v14c2.4-1.1 4.8-1.1 7 0V5.2Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" opacity="0.75" />
    </svg>
  )
}

export function LightbulbIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 17.5h6M10 20.5h4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.6.45.9 1.15.9 1.9v.3h5.8v-.3c0-.75.3-1.45.9-1.9A6.5 6.5 0 0 0 12 2.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export function RobotIcon({ color, size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="9" width="14" height="10" rx="3" stroke={color} strokeWidth="1.6" />
      <path d="M12 6V3.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="2.7" r="1" fill={color} />
      <circle cx="9" cy="14" r="1.2" fill={color} />
      <circle cx="15" cy="14" r="1.2" fill={color} />
      <path d="M2.5 12.5v3M21.5 12.5v3" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

export function GraduationCapIcon({ color, size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M2 9l10-4.5L22 9l-10 4.5L2 9Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6.5 11.2v4.3c0 1.3 2.5 2.5 5.5 2.5s5.5-1.2 5.5-2.5v-4.3" stroke={color} strokeWidth="1.6" strokeLinejoin="round" opacity="0.8" />
      <path d="M21 10v5.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function SearchIcon2({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth="1.6" />
      <path d="M15.3 15.3L20.5 20.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function OfflineIcon({ color, size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 3l18 18" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5.5 9.5a12 12 0 0 1 4.6-2.6M8.5 12.7a7.7 7.7 0 0 1 3-1.6M18.5 9.5a12 12 0 0 0-2.9-2.1" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      <circle cx="12" cy="17.5" r="1.3" fill={color} />
    </svg>
  )
}

export function PauseIcon({ color, size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="4.5" width="4" height="15" rx="1.3" fill={color} />
      <rect x="14" y="4.5" width="4" height="15" rx="1.3" fill={color} />
    </svg>
  )
}

export function PlayIcon({ color, size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6.5 4.2v15.6a1 1 0 0 0 1.5.87l13-7.8a1 1 0 0 0 0-1.74l-13-7.8a1 1 0 0 0-1.5.87Z" fill={color} />
    </svg>
  )
}

export function EmptyBoxIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3.5 8.5L12 4l8.5 4.5V17L12 21.5 3.5 17V8.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" opacity="0.85" />
      <path d="M3.5 8.5L12 13l8.5-4.5" stroke={color} strokeWidth="1.6" strokeLinejoin="round" opacity="0.7" />
      <path d="M12 13v8.5" stroke={color} strokeWidth="1.6" opacity="0.7" />
    </svg>
  )
}

export function FlagIcon({ color, size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 3v18" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M6 4.5c3-1.4 5-1.4 8 0 2.4 1.1 4-0.2 4-0.2v9c0 0-1.6 1.3-4 0.2-3-1.4-5-1.4-8 0v-9Z" fill={color} opacity="0.9" />
    </svg>
  )
}

// ── Batch 2 additions — file-type / document icons, replacing 📖 ❓
// 🎥 🎵 📄 📁 🔄 across ModulePage/StagePage/FilesPage/ErrorBoundary.
// Same thin-line-art convention as everything above, static (no
// draw-in), since these sit inline in file lists and small buttons.

export function QuestionMarkIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 9a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1.1-1.5 2.1v.8" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="18" r="1.1" fill={color} />
    </svg>
  )
}

export function VideoIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="13" height="12" rx="2.5" stroke={color} strokeWidth="1.6" />
      <path d="M16.5 10.2l4-2.4v8.4l-4-2.4" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export function AudioIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="18" r="2.5" stroke={color} strokeWidth="1.6" />
      <circle cx="17" cy="14.5" r="2.5" stroke={color} strokeWidth="1.6" />
      <path d="M10.5 18V5.5l9-2v11" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DocumentIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 3.5h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3.5V7.5a1 1 0 0 0 1 1h4" stroke={color} strokeWidth="1.6" strokeLinejoin="round" opacity="0.6" />
      <path d="M8.5 13h7M8.5 16h7" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
    </svg>
  )
}

export function FolderIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.4c.3 0 .58.13.77.36l1.2 1.44c.19.23.47.36.77.36H19a1.5 1.5 0 0 1 1.5 1.5v9.34A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V6.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export function RefreshIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 12a8 8 0 0 1 13.66-5.66L20 8.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 4v4.5h-4.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12a8 8 0 0 1-13.66 5.66L4 15.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20v-4.5h4.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CheckCircleIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function GearIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth="1.6" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.2 6.2l1.7 1.7M18.1 16.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 17.8l1.7-1.7M18.1 7.9l1.7-1.7" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function EditIcon({ color, size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 20l.9-4.2L15.6 5.1a1.5 1.5 0 0 1 2.1 0l1.2 1.2a1.5 1.5 0 0 1 0 2.1L8.2 19.1 4 20Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13.8 6.9l3.3 3.3" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

export function PlusIcon({ color, size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 4.5v15M4.5 12h15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function XCircleIcon({ color, size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <path d="M9 9l6 6M15 9l-6 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function PackageIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3.5 8.5L12 4l8.5 4.5V17L12 21.5 3.5 17V8.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3.5 8.5L12 13l8.5-4.5" stroke={color} strokeWidth="1.6" />
      <path d="M12 13v8.5" stroke={color} strokeWidth="1.6" />
      <path d="M7.7 6.2l8.6 4.6" stroke={color} strokeWidth="1.4" opacity="0.7" />
    </svg>
  )
}

export function ChartBarIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 20V10M10 20V4M16 20v-7M20 20v-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function ClipboardIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4.5" width="14" height="17" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

export function PeopleIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3" stroke={color} strokeWidth="1.6" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.4" stroke={color} strokeWidth="1.5" opacity="0.7" />
      <path d="M15.5 19c.2-2.3 1.6-4.1 3.6-4.7" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

export function ConstructionIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 20l6-6M21 20l-6-6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="9.5" y="4" width="5" height="10" rx="1.2" transform="rotate(45 12 9)" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

export function DotIcon({ color, size = 10 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill={color} />
    </svg>
  )
}

export function SendIcon({ color, size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M21 3L10.5 13.5M21 3l-6.5 18-4-8-8-4L21 3Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export function MegaphoneIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5v3a1.5 1.5 0 0 0 1.5 1.5H6l1.6 5c.2.6.75 1 1.4 1h.6a1 1 0 0 0 .95-1.3L9.2 15h1L19 19V6l-8.8 4H4.5A1.5 1.5 0 0 0 3 10.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M21.5 9.5v6" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

export function ListIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 6.5h11M9 12h11M9 17.5h11" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="4" cy="6.5" r="1.2" fill={color} />
      <circle cx="4" cy="12" r="1.2" fill={color} />
      <circle cx="4" cy="17.5" r="1.2" fill={color} />
    </svg>
  )
}

export function LinkIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M10 14.5l4-4" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8.5 16.5l-1.8 1.8a3.2 3.2 0 0 1-4.5-4.5L5 11a3.2 3.2 0 0 1 4.5 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.5 7.5l1.8-1.8a3.2 3.2 0 0 1 4.5 4.5L19 13a3.2 3.2 0 0 1-4.5 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// ── Batch 3 additions — replacing remaining raw emoji across
// user-facing pages (NotFound's 🧭, the 4 built-in exam-stage badges'
// 👥📘🧪🏁 and their 📌 fallback, empty-state 🚧) with the same
// thin-line-art convention as everything above.

export function CompassIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <path d="M15.3 8.7l-2.1 5.1-5.1 2.1 2.1-5.1 5.1-2.1Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

export function FlaskIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M10 3.5h4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.5 3.5v5.3c0 .35-.1.7-.28 1L6.4 16.6a2.6 2.6 0 0 0 2.2 4h6.8a2.6 2.6 0 0 0 2.2-4l-3.82-6.8a2 2 0 0 1-.28-1V3.5" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.8 14.7h8.4" stroke={color} strokeWidth="1.5" opacity="0.7" />
    </svg>
  )
}

export function FlagCheckeredIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 21V3" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M6 4.2c3-1.3 5-1.3 8 0 2.4 1 4-0.2 4-0.2v8c0 0-1.6 1.2-4 0.2-3-1.3-5-1.3-8 0V4.2Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 5.3v1.9M13 5.3v1.9M9 9.1v1.9M13 9.1v1.9" stroke={color} strokeWidth="1.2" opacity="0.6" />
    </svg>
  )
}

export function PinIcon({ color, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 21s-6.5-6.1-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.9-6.5 11-6.5 11Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.2" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

export function LightningIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2.5L4.5 13.5h6L10.5 21.5 19.5 10h-6L13 2.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill={color} fillOpacity="0.12" />
    </svg>
  )
}

export function ArchiveBoxIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="5" rx="1.5" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4.5 9v9a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V9" stroke={color} strokeWidth="1.6" strokeLinejoin="round" opacity="0.85" />
      <path d="M10 13.5h4" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

export function WhatsAppIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.2A8.5 8.5 0 1 0 12 3.5Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 8.7c.15-.4.5-.7.9-.7h.5c.3 0 .55.2.65.5l.5 1.3c.1.25.05.55-.15.75l-.5.55c.4.95 1.2 1.75 2.15 2.15l.55-.5c.2-.2.5-.25.75-.15l1.3.5c.3.1.5.35.5.65v.5c0 .4-.3.75-.7.9-2.6.9-5.6-.5-7-3-.75-1.35-1-2.75-.45-4.03Z"
        fill={color}
      />
    </svg>
  )
}

export function UserIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.6" stroke={color} strokeWidth="1.6" />
      <path d="M5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function StarIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.2l2.47 5.24 5.73.68-4.25 3.98 1.15 5.72L12 15.9l-5.1 2.92 1.15-5.72L3.8 9.12l5.73-.68L12 3.2Z"
        fill={color}
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
