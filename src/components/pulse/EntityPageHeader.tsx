import type { ReactNode } from 'react'
import { pulseType, ON_GRADIENT_TOP } from '../../premiumTheme'
import { ModuleIcon } from '../../lib/medicalIcons'

interface EntityPageHeaderProps {
  icon: ReactNode
  title: string
  titleColor: string
  moduleIcon?: string | null
  moduleName: string
}

// Centered icon + title + "under this module" line — shared header
// used by StagePage, SubjectPage, and LessonPage.
export default function EntityPageHeader({ icon, title, titleColor, moduleIcon, moduleName }: EntityPageHeaderProps) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 0 30px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        {icon}
      </div>
      <h1 style={{ ...pulseType.pageTitle, fontSize: 24, color: titleColor, marginBottom: 6 }}>{title}</h1>
      <div style={{ color: ON_GRADIENT_TOP.secondary, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <ModuleIcon value={moduleIcon} size={14} color={ON_GRADIENT_TOP.secondary} /> {moduleName}
      </div>
    </div>
  )
}
