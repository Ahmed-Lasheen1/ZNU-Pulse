import { useRef, useState } from 'react'
import { supabase } from '@/core/supabase'
import { syncContentVersions } from '@/services/content/contentVersions'
import { clearFileCaches } from '@/services/content/moduleContent'
import { invalidateExamSchedules } from '@/services/content/homeData'

// Refreshes the caches that depend on the table that was just written.
function afterWrite(table: string) {
  syncContentVersions({ force: true })
  if (table === 'files') clearFileCaches()
  if (table === 'schedules') invalidateExamSchedules()
}

// Deletes one row of an admin table and refreshes the related caches.
export async function deleteAdminEntity(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (!error) afterWrite(table)
  return error
}

// Custom save functions may return a Promise or a Supabase query builder (a thenable).
interface CrudArgs<T> {
  table: string
  label: string
  editingId: string | null
  buildPayload: () => T
  resetForm: () => void
  refresh: () => void
  showMessage: (msg: string) => void
  updateFn?: (id: string, payload: T) => PromiseLike<{ error: any }>
  insertFn?: (payload: T) => PromiseLike<{ error: any }>
}

// Shared save and delete handling for the admin tabs (insert or update, messages, cache refresh).
export function useAdminEntityCrud<T>({
  table, label, editingId, buildPayload, resetForm, refresh, showMessage, updateFn, insertFn
}: CrudArgs<T>) {
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  // Inserts or updates the row built from the form, then resets the form.
  async function save() {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    const payload = buildPayload()
    const { error } = editingId
      ? updateFn ? await updateFn(editingId, payload) : await supabase.from(table).update(payload as any).eq('id', editingId)
      : insertFn ? await insertFn(payload) : await supabase.from(table).insert([payload as unknown as Record<string, unknown>])
    savingRef.current = false
    setSaving(false)
    if (error) { showMessage('❌ ' + error.message); return }
    afterWrite(table)
    showMessage(`✅ ${label} ${editingId ? 'updated' : 'added'}!`)
    resetForm()
    refresh()
  }

  // Deletes one row and reloads the list.
  async function remove(id: string) {
    if (editingId === id) resetForm()
    const error = await deleteAdminEntity(table, id)
    showMessage(error ? '❌ ' + error.message : `✅ ${label} deleted`)
    refresh()
  }

  return { saving, save, remove }
}
