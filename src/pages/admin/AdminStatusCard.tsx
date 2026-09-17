import type { ReactNode } from 'react'
import EmptyState from '../../components/pulse/EmptyState'

interface AdminStatusCardProps {
  dark: boolean
  message: ReactNode
}

// Thin wrapper over the shared EmptyState card — AdminStatusCard and
// EmptyState rendered byte-for-byte identical markup (LiquidGlassCard,
// 40px padding, centered pt.sub text row), just from two separate
// files. Every admin tab's <AdminStatusCard dark={...} message={...} />
// call site is unchanged — same padding, same layout.
export default function AdminStatusCard({ dark, message }: AdminStatusCardProps) {
  return <EmptyState dark={dark} message={message} />
}
