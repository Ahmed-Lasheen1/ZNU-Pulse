import { useState, useEffect, useMemo } from 'react'
import { storageGet, storageSet } from '../../lib/safeStorage'
import type { AdminModule, AdminSubject, AdminLesson, AdminContext, ContextSelection } from './adminTypes'

const STORAGE_KEY = 'znu_admin_context'

export const PICK_MODULE_MESSAGE = '❌ Pick a module above first'

function readStoredSelection(): ContextSelection {
  try {
    const parsed = JSON.parse(storageGet(STORAGE_KEY) || '{}')
    return {
      moduleId: String(parsed.moduleId || ''),
      subjectId: String(parsed.subjectId || ''),
      lessonId: String(parsed.lessonId || ''),
    }
  } catch {
    return { moduleId: '', subjectId: '', lessonId: '' }
  }
}

export function useAdminContext(modules: AdminModule[], subjects: AdminSubject[], lessons: AdminLesson[]): AdminContext {
  const [selection, setSelection] = useState<ContextSelection>(readStoredSelection)

  useEffect(() => {
    storageSet(STORAGE_KEY, JSON.stringify(selection))
  }, [selection])

  return useMemo(() => {
    const moduleId = modules.some(m => m.id === selection.moduleId) ? selection.moduleId : ''
    const subjectId = subjects.some(s => s.id === selection.subjectId && s.module_id === moduleId) ? selection.subjectId : ''
    const lessonId = lessons.some(l => l.id === selection.lessonId && l.subject_id === subjectId) ? selection.lessonId : ''
    return { moduleId, subjectId, lessonId, setContext: setSelection }
  }, [modules, subjects, lessons, selection])
}
