import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme, pulseType } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import ConfirmDialog from '../../components/ConfirmDialog'
import AdminFormCard from './AdminFormCard'
import { inStyle as adminInStyle, fieldLabel } from './adminStyles'
import { useAdminMessage } from './useAdminMessage'
import { invalidateDriveUrlCache } from '../../lib/siteSettings'
import { MegaphoneIcon, SendIcon, LinkIcon } from '../../components/ui/tool-icons'

interface SettingsTabProps {
  dark: boolean
}

const ANNOUNCEMENT_PREVIEW_MAX_WIDTH = 380

export default function SettingsTab({ dark }: SettingsTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const { message, showMessage } = useAdminMessage()

  const [announcement, setAnnouncement] = useState('')
  const [announcementSaving, setAnnouncementSaving] = useState(false)
  const [driveUrl, setDriveUrl] = useState('')
  const [driveUrlSaving, setDriveUrlSaving] = useState(false)
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastBody, setBroadcastBody] = useState('')
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [confirmBroadcastOpen, setConfirmBroadcastOpen] = useState(false)

  useEffect(() => {
    supabase.from('site_settings').select('key, value').in('key', ['home_announcement', 'drive_url']).then(({ data }) => {
      if (!data) return
      const byKey = Object.fromEntries(data.map((r: any) => [r.key, r.value || '']))
      setAnnouncement(byKey['home_announcement'] || '')
      setDriveUrl(byKey['drive_url'] || '')
    })
  }, [])

  async function saveAnnouncement() {
    setAnnouncementSaving(true)
    const { error } = await supabase.from('site_settings').upsert({ key: 'home_announcement', value: announcement.trim() })
    setAnnouncementSaving(false)
    showMessage(error ? '❌ ' + error.message : '✅ Announcement updated!')
  }

  async function saveDriveUrl() {
    setDriveUrlSaving(true)
    const { error } = await supabase.from('site_settings').upsert({ key: 'drive_url', value: driveUrl.trim() })
    setDriveUrlSaving(false)
    if (!error) invalidateDriveUrlCache()
    showMessage(error ? '❌ ' + error.message : '✅ Drive link updated!')
  }

  function requestBroadcast() {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return showMessage('❌ Please fill in both fields')
    setConfirmBroadcastOpen(true)
  }

  async function sendBroadcast() {
    setConfirmBroadcastOpen(false)
    setBroadcastSending(true)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ title: broadcastTitle.trim(), body: broadcastBody.trim() }),
      })
      const result = await res.json()
      if (!res.ok) return showMessage('❌ ' + (result.error || 'Failed to send'))
      showMessage(`✅ Sent to ${result.sent} device(s)!`)
      setBroadcastTitle('')
      setBroadcastBody('')
    } catch {
      showMessage('❌ Network error — please try again')
    } finally {
      setBroadcastSending(false)
    }
  }

  return (
    <div>
      <InlineMessage message={message} />

      <style>{`
        .settings-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        @media (min-width: 900px) {
          .settings-row { grid-template-columns: 1fr 1fr; align-items: stretch; }
        }
      `}</style>

      <div className="settings-row">
        <AdminFormCard
          dark={dark}
          title="Push Notification to Everyone"
          Icon={MegaphoneIcon}
          description="Delivered instantly to every device with notifications enabled, even if the site isn't open. You'll be asked to confirm before it sends."
          addLabel={<><SendIcon color="#fff" size={13} /> Send to Everyone</>}
          savingLabel="Sending..."
          saving={broadcastSending}
          onSave={requestBroadcast}
        >
          <input dir="auto" placeholder="Title (e.g. New questions added!)" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} style={inStyle} />
          <textarea dir="auto" placeholder="Message" value={broadcastBody} onChange={e => setBroadcastBody(e.target.value)} style={{ ...inStyle, minHeight: 70, resize: 'vertical', flex: 1 }} />
        </AdminFormCard>

        <AdminFormCard
          dark={dark}
          title="Home Page Announcement"
          Icon={MegaphoneIcon}
          description="Shows at the top of the Home page. Leave empty to hide it. The preview matches the real card's width, and Enter adds a line break."
          addLabel="Save Announcement"
          saving={announcementSaving}
          onSave={saveAnnouncement}
        >
          <div style={{ maxWidth: ANNOUNCEMENT_PREVIEW_MAX_WIDTH, marginBottom: 12, flex: 1 }}>
            <LiquidGlassCard dark={dark} instant style={{ padding: '16px 20px', height: '100%' }}>
              <textarea
                dir="auto"
                placeholder="e.g. Pharma exam next week, study well!"
                value={announcement}
                onChange={e => setAnnouncement(e.target.value)}
                style={{
                  display: 'block', width: '100%', height: '100%', minHeight: 102, padding: 0,
                  border: 'none', background: 'transparent', outline: 'none',
                  ...pulseType.bodyEmphasis, fontSize: 13, color: pt.textPrimary,
                  lineHeight: 1.5, textAlign: 'left', fontFamily: 'inherit',
                  whiteSpace: 'pre-line', wordBreak: 'break-word',
                  resize: 'vertical', boxSizing: 'border-box'
                }}
              />
            </LiquidGlassCard>
          </div>
        </AdminFormCard>
      </div>

      <AdminFormCard
        dark={dark}
        title="Google Drive Link"
        Icon={LinkIcon}
        description={`Shown as the "University Google Drive" button wherever it's offered. Leave it empty to hide the button entirely.`}
        addLabel="Save Drive Link"
        saving={driveUrlSaving}
        onSave={saveDriveUrl}
      >
        <label style={fieldLabel(pt)}>Drive URL</label>
        <input placeholder="https://drive.google.com/..." value={driveUrl} onChange={e => setDriveUrl(e.target.value)} style={{ ...inStyle, marginBottom: 16 }} />
      </AdminFormCard>

      <ConfirmDialog
        dark={dark}
        open={confirmBroadcastOpen}
        title="Send push notification?"
        message={`Send "${broadcastTitle.trim()}" to every device with notifications enabled right now? This can't be undone once it's sent.`}
        confirmLabel="Send"
        confirmColor={pt.cobalt}
        onCancel={() => setConfirmBroadcastOpen(false)}
        onConfirm={sendBroadcast}
      />
    </div>
  )
}
