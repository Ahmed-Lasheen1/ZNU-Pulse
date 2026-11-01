// src/pages/admin/useConfirmDelete.ts
import { useState } from 'react'

// Shared "pick an id → confirm → remove(id)" wiring for admin delete buttons.
export function useConfirmDelete(removeFn: (id: string) => void) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return {
    open: !!confirmId,
    requestDelete: (id: string) => setConfirmId(id),
    cancel: () => setConfirmId(null),
    confirm: () => {
      const id = confirmId
      setConfirmId(null)
      if (id) removeFn(id)
    },
  }
}
