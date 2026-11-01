import { getPulseTheme } from '../../premiumTheme'
import ConfirmDialog from '../../components/ConfirmDialog'
import type { useConfirmDelete } from './useConfirmDelete'

interface AdminDeleteDialogProps {
  dark: boolean
  noun: string
  del: ReturnType<typeof useConfirmDelete>
  message?: string
}

export default function AdminDeleteDialog({ dark, noun, del, message = 'This cannot be undone.' }: AdminDeleteDialogProps) {
  const pt = getPulseTheme(dark)

  return (
    <ConfirmDialog
      dark={dark}
      open={del.open}
      title={`Delete ${noun}?`}
      message={message}
      confirmLabel="Delete"
      confirmColor={pt.danger}
      onCancel={del.cancel}
      onConfirm={del.confirm}
    />
  )
}
