import type { ReactNode } from 'react'

interface AdminSplitLayoutProps {
  form: ReactNode
  list: ReactNode
}

export default function AdminSplitLayout({ form, list }: AdminSplitLayoutProps) {
  return (
    <div className="admin-split">
      <style>{`
        .admin-split {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (min-width: 1000px) {
          .admin-split {
            grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
            gap: 28px;
          }
          .admin-split-form {
            position: sticky;
            top: 96px;
            max-height: calc(100dvh - 116px);
            overflow-y: auto;
            padding: 4px;
          }
        }
      `}</style>
      <div className="admin-split-form">{form}</div>
      <div style={{ minWidth: 0 }}>{list}</div>
    </div>
  )
}
