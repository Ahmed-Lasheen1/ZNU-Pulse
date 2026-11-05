import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { pulseFonts } from '@/shared/theme/premiumTheme'

interface StudyShellProps {
  children: ReactNode
  overlays?: ReactNode
  bottomPadding?: number
  maxWidth?: string
}

// Full-screen container for study sessions; overlays stay outside the animated wrapper so fixed dialogs aren't affected by its transform.
export default function StudyShell({ children, overlays, bottomPadding = 16, maxWidth = 'min(1080px, 92vw)' }: StudyShellProps) {
  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative', zIndex: 1,
          maxWidth, margin: '0 auto',
          padding: `12px clamp(16px, 3vw, 36px) ${bottomPadding}px`, fontFamily: pulseFonts.body
        }}
      >
        {children}
      </motion.div>
      {overlays}
    </div>
  )
}
