export type AdminIcon = (props: { color: string; size?: number }) => JSX.Element

export interface AdminModule {
  id: string
  name: string
  icon?: string | null
  color: string
  status: 'active' | 'completed'
}

export interface AdminSubject {
  id: string
  module_id: string
  name: string
  type?: string
  icon?: string | null
  color?: string | null
}

export interface AdminLesson {
  id: string
  module_id: string
  subject_id: string
  title: string
  icon?: string | null
}

export interface ContextSelection {
  moduleId: string
  subjectId: string
  lessonId: string
}

export interface AdminContext extends ContextSelection {
  setContext: (next: ContextSelection) => void
}
