import type { ReactNode } from 'react'

interface AdminSplitLayoutProps {
  // The create/edit form — pinned to the left and sticky on desktop.
  form: ReactNode
  // The live list of existing rows (files/questions/subjects/etc).
  list: ReactNode
  // Width of the form column on desktop.
  formWidth?: number
}

// Side-by-side form + list layout from 1000px up (a widescreen
// tablet/laptop breakpoint); falls back to a single-column stack
// below that.
export default function AdminSplitLayout({ form, list, formWidth = 380 }: AdminSplitLayoutProps) {
  return (
    <div className="admin-split" style={{ ['--admin-form-w' as any]: `${formWidth}px` }}>
      <style>{`
        .admin-split {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (min-width: 1000px) {
          .admin-split {
            grid-template-columns: var(--admin-form-w) 1fr;
            gap: 28px;
          }
          .admin-split-form {
            position: sticky;
            top: calc(max(16px, env(safe-area-inset-top)) + 12px);
            max-height: calc(100dvh - max(16px, env(safe-area-inset-top)) - 32px);
            overflow-y: auto;
            padding-bottom: 4px;
          }
        }
        .admin-list-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 1500px) {
          .admin-list-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
      <div className="admin-split-form">{form}</div>
      <div className="admin-split-list" style={{ minWidth: 0 }}>{list}</div>
    </div>
  )
}
