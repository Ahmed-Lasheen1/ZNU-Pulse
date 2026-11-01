// src/components/SummaryOverlay.jsx
import { useState, useEffect } from 'react'
import FullscreenViewer from './FullscreenViewer'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { prepareOfflineSummary } from '../lib/summaryStore'

const OFFLINE_NOTICE = "This summary isn't saved for offline use. Open it once while online and it will be available here."

// Full-screen summary viewer — thin adapter over the shared FullscreenViewer.
// Online it shows the live page; the page is saved in the background so the
// saved copy can be shown when there is no connection.
export default function SummaryOverlay({ dark, onBack, url, title, fileType }) {
  const offline = !useOnlineStatus()
  const [savedHtml, setSavedHtml] = useState(undefined)

  useEffect(() => {
    let ignore = false
    prepareOfflineSummary(url).then(html => { if (!ignore) setSavedHtml(html) })
    return () => { ignore = true }
  }, [url])

  if (offline && savedHtml === undefined) return null

  return (
    <FullscreenViewer
      dark={dark} onClose={onBack} src={url} title={title} fileType={fileType}
      srcDoc={offline && savedHtml ? savedHtml : undefined}
      notice={offline && !savedHtml ? OFFLINE_NOTICE : undefined}
    />
  )
}
