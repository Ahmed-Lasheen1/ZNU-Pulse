import { useState, useEffect, useMemo } from 'react'
import { storageGetJson, storageSetJson } from '@/core/safeStorage'
import type { AdminModule, AdminSubject, AdminLesson, AdminContext, ContextSelection } from '@/features/admin/common/adminTypes'

const STORAGE_KEY = 'znu_admin_context'

export const PICK_MODULE_MESSAGE = '❌ Pick a module above first'
export const REQUIRED_FIELDS_MESSAGE = '❌ Please fill in all required fields'

// Reads the last admin module/subject/lesson selection saved on this device.
function readStoredSelection(): ContextSelection {
  const parsed = storageGetJson(STORAGE_KEY, {})
  return {
    moduleId: String(parsed.moduleId || ''),
    subjectId: String(parsed.subjectId || ''),
    lessonId: String(parsed.lessonId || ''),
  }
}

// Keeps the admin context selection saved and drops ids that no longer exist.
export function useAdminContext(modules: AdminModule[], subjects: AdminSubject[], lessons: AdminLesson[]): AdminContext {
  const [selection, setSelection] = useState<ContextSelection>(readStoredSelection)

  useEffect(() => {
    storageSetJson(STORAGE_KEY, selection)
  }, [selection])

  return useMemo(() => {
    const moduleId = modules.some(m => m.id === selection.moduleId) ? selection.moduleId : ''
    const subjectId = subjects.some(s => s.id === selection.subjectId && s.module_id === moduleId) ? selection.subjectId : ''
    const lessonId = lessons.some(l => l.id === selection.lessonId && l.subject_id === subjectId) ? selection.lessonId : ''
    return { moduleId, subjectId, lessonId, setContext: setSelection }
  }, [modules, subjects, lessons, selection])
}
