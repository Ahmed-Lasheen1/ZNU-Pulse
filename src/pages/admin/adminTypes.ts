// src/pages/admin/adminTypes.ts

// Shared shapes for the reference data every admin tab is handed as
// props from Admin.tsx (modules/subjects/lessons) — one place so each
// tab isn't independently guessing at (or duplicating) the same
// interface.
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
  exam_stage?: string | null
}
