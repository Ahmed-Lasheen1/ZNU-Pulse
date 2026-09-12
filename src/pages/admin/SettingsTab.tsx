import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme, pulseType } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import { btnStyle, inStyle as adminInStyle, fieldLabel } from './adminStyles'
import { useAdminMessage } from './useAdminMessage'
import { MegaphoneIcon, SendIcon, LinkIcon } from '../../components/ui/tool-icons'

interface SettingsTabProps {
  dark: boolean
}

// Capped to roughly match the real announcement card's width on Home
// (the narrow desktop dashboard column, or full width on mobile), so
// a line that wraps here also wraps on the real card.
const ANNOUNCEMENT_PREVIEW_MAX_WIDTH = 380

export default function SettingsTab({ dark }: SettingsTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const { message: msg, showMessage: showMsg } = useAdminMessage()

  const [announcement, setAnnouncement] = useState('')
  const [announcementSaving, setAnnouncementSaving] = useState(false)
  const [driveUrl, setDriveUrl] = useState('')
  const [driveUrlSaving, setDriveUrlSaving] = useState(false)
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastBody, setBroadcastBody] = useState('')
  const [broadcastSending, setBroadcastSending] = useState(false)

  useEffect(() => { fetchAnnouncement() }, [])

  async function fetchAnnouncement() {
    const { data } = await supabase.from('site_settings').select('key, value').in('key', ['home_announcement', 'drive_url'])
    if (data) {
      const byKey = Object.fromEntries(data.map((r: any) => [r.key, r.value || '']))
      setAnnouncement(byKey['home_announcement'] || '')
      setDriveUrl(byKey['drive_url'] || '')
    }
  }

  async function saveAnnouncement() {
    setAnnouncementSaving(true)
    const { error } = await supabase.from('site_settings').upsert({ key: 'home_announcement', value: announcement.trim() })
    setAnnouncementSaving(false)
    showMsg(error ? '❌ ' + error.message : '✅ Announcement updated!')
  }

  async function saveDriveLinks() {
    setDriveUrlSaving(true)
    const { error } = await supabase.from('site_settings').upsert({ key: 'drive_url', value: driveUrl.trim() })
    setDriveUrlSaving(false)
    showMsg(error ? '❌ ' + error.message : '✅ Drive link updated!')
  }

  async function sendBroadcast() {
    const title = broadcastTitle.trim()
    const body = broadcastBody.trim()
    if (!title || !body) return showMsg('❌ Please fill in both fields')
    if (!confirm(`Send "${title}" to every device with notifications enabled right now? This can't be undone once it's sent.`)) return

    setBroadcastSending(true)
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ title, body })
      })
      const result = await res.json()
      setBroadcastSending(false)
      if (!res.ok) return showMsg('❌ ' + (result.error || 'Failed to send'))
      showMsg(`✅ Sent to ${result.sent} device(s)!`)
      setBroadcastTitle(''); setBroadcastBody('')
    } catch (e) {
      setBroadcastSending(false)
      showMsg('❌ Network error — please try again')
    }
  }

  return (
    <div>
      <InlineMessage message={msg} />

      <style>{`
        .settings-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 900px) {
          .settings-row { grid-template-columns: 1fr 1fr; align-items: stretch; }
        }
      `}</style>

      <div className="settings-row" style={{ marginBottom: 16 }}>
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: pt.cobalt, marginBottom: 8, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MegaphoneIcon color={pt.cobalt} size={17} /> Push Notification to Everyone
          </h3>
          <p style={{ color: pt.textMuted, fontSize: 13, marginBottom: 16 }}>
            Delivered instantly to every device with notifications enabled — even if they don't have the site open right now.
            You'll be asked to confirm before it sends.
          </p>
          <input placeholder="Title (e.g. New questions added!)" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} style={inStyle} />
          <textarea placeholder="Message" value={broadcastBody} onChange={e => setBroadcastBody(e.target.value)} style={{ ...inStyle, minHeight: 70, resize: 'vertical', flex: 1 }} />
          <button onClick={sendBroadcast} disabled={broadcastSending} style={{ ...btnStyle(pt, dark), width: '100%', marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {broadcastSending ? 'Sending...' : <><SendIcon color="#fff" size={13} /> Send to Everyone</>}
          </button>
        </LiquidGlassCard>

        <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: pt.cobalt, marginBottom: 8, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MegaphoneIcon color={pt.cobalt} size={17} /> Home Page Announcement
          </h3>
          <p style={{ color: pt.textMuted, fontSize: 13, marginBottom: 16 }}>
            Shows at the top of the Home page. Leave empty to hide it. Preview below matches the real
            card's width, and Enter adds a line break.
          </p>
          <div style={{ maxWidth: ANNOUNCEMENT_PREVIEW_MAX_WIDTH, marginBottom: 12, flex: 1 }}>
            <LiquidGlassCard dark={dark} instant style={{ padding: '16px 20px', height: '100%' }}>
              <textarea
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
                }} />
            </LiquidGlassCard>
          </div>
          <button onClick={saveAnnouncement} disabled={announcementSaving} style={{ ...btnStyle(pt, dark), width: '100%', marginTop: 'auto' }}>
            {announcementSaving ? 'Saving...' : 'Save Announcement'}
          </button>
        </LiquidGlassCard>
      </div>

      <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
        <h3 style={{ color: pt.cobalt, marginBottom: 8, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <LinkIcon color={pt.cobalt} size={17} /> Google Drive Link
        </h3>
        <p style={{ color: pt.textMuted, fontSize: 13, marginBottom: 16 }}>
          Shown as the "University Google Drive" button wherever it's offered. Leave it empty to hide the button entirely.
        </p>

        <label style={fieldLabel(pt)}>Drive URL</label>
        <input
          placeholder="https://drive.google.com/..."
          value={driveUrl}
          onChange={e => setDriveUrl(e.target.value)}
          style={{ ...inStyle, marginBottom: 16 }} />

        <button onClick={saveDriveLinks} disabled={driveUrlSaving} style={{ ...btnStyle(pt, dark), width: '100%' }}>
          {driveUrlSaving ? 'Saving...' : 'Save Drive Link'}
        </button>
      </LiquidGlassCard>
    </div>
  )
}
