import { useState } from 'react'
import { supabase } from '../../supabase'

export async function deleteAdminEntity(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  return error
}

interface CrudArgs<T> {
  table: string
  label: string
  editingId: string | null
  buildPayload: () => T
  resetForm: () => void
  refresh: () => void
  showMessage: (msg: string) => void
  updateFn?: (id: string, payload: T) => Promise<{ error: any }>
  insertFn?: (payload: T) => Promise<{ error: any }>
}

export function useAdminEntityCrud<T>({
  table, label, editingId, buildPayload, resetForm, refresh, showMessage, updateFn, insertFn
}: CrudArgs<T>) {
  const [saving, setSaving] = useState(false)

  async function save() {
    if (saving) return
    setSaving(true)
    const payload = buildPayload()
    const { error } = editingId
      ? updateFn ? await updateFn(editingId, payload) : await supabase.from(table).update(payload as any).eq('id', editingId)
      : insertFn ? await insertFn(payload) : await supabase.from(table).insert([payload])
    setSaving(false)
    if (error) { showMessage('❌ ' + error.message); return }
    showMessage(`✅ ${label} ${editingId ? 'updated' : 'added'}!`)
    resetForm()
    refresh()
  }

  async function remove(id: string) {
    if (editingId === id) resetForm()
    const error = await deleteAdminEntity(table, id)
    showMessage(error ? '❌ ' + error.message : `✅ ${label} deleted`)
    refresh()
  }

  return { saving, save, remove }
}
