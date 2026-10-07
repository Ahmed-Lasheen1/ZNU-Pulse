import type { ReactNode } from 'react'

interface AdminSplitLayoutProps {
  form: ReactNode
  list: ReactNode
  formWidth?: number
}

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
            top: 28px;
            max-height: calc(100dvh - 48px);
            overflow-y: auto;
            padding-bottom: 4px;
          }
        }
      `}</style>
      <div className="admin-split-form">{form}</div>
      <div style={{ minWidth: 0 }}>{list}</div>
    </div>
  )
}
