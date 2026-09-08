import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { getPulseTheme, pulseType } from '../../premiumTheme'
import InlineMessage from '../../components/InlineMessage'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import { btnStyle, inStyle as adminInStyle, fieldLabel } from './adminStyles'
import { EXAM_STAGES as STAGE_META } from '../../lib/examStages'
import { MegaphoneIcon, SendIcon, LinkIcon } from '../../components/ui/tool-icons'

interface SettingsTabProps {
  dark: boolean
}

export default function SettingsTab({ dark }: SettingsTabProps) {
  const pt = getPulseTheme(dark)
  const inStyle = adminInStyle(pt, dark)
  const [msg, setMsg] = useState('')
  function showMsg(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const [announcement, setAnnouncement] = useState('')
  const [announcementSaving, setAnnouncementSaving] = useState(false)
  const [driveUrl, setDriveUrl] = useState('')
  const [stageDriveUrls, setStageDriveUrls] = useState<Record<string, string>>({ tbl: '', end_module: '', practical: '', final: '' })
  const [driveUrlSaving, setDriveUrlSaving] = useState(false)
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastBody, setBroadcastBody] = useState('')
  const [broadcastSending, setBroadcastSending] = useState(false)

  useEffect(() => { fetchAnnouncement() }, [])

  async function fetchAnnouncement() {
    const keys = ['home_announcement', 'drive_url', ...STAGE_META.map(s => `drive_url_${s.value}`)]
    const { data } = await supabase.from('site_settings').select('key, value').in('key', keys)
    if (data) {
      const byKey = Object.fromEntries(data.map((r: any) => [r.key, r.value || '']))
      setAnnouncement(byKey['home_announcement'] || '')
      setDriveUrl(byKey['drive_url'] || '')
      setStageDriveUrls({
        tbl: byKey['drive_url_tbl'] || '',
        end_module: byKey['drive_url_end_module'] || '',
        practical: byKey['drive_url_practical'] || '',
        final: byKey['drive_url_final'] || '',
      })
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
    const upserts = [
      { key: 'drive_url', value: driveUrl.trim() },
      ...STAGE_META.map(s => ({ key: `drive_url_${s.value}`, value: (stageDriveUrls[s.value] || '').trim() }))
    ]
    const { error } = await supabase.from('site_settings').upsert(upserts)
    setDriveUrlSaving(false)
    showMsg(error ? '❌ ' + error.message : '✅ Drive links updated!')
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

      {/* AUDIT FIX (messy layout): the three cards used to be one
          uneven single-column stack — a short broadcast card, then a
          tall drive-links card with every stage input stacked
          vertically, then the announcement box. Regrouped into two
          clear rows: two similarly-sized action cards up top
          (Broadcast / Announcement — the "write something, send it"
          pair), then Drive Links on its own full-width row below with
          its per-stage inputs laid out as a compact grid instead of a
          long vertical list, so the card's height stops dwarfing
          everything else on the page. */}
      <style>{`
        .settings-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 900px) {
          .settings-row { grid-template-columns: 1fr 1fr; align-items: start; }
        }
        .drive-links-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px 16px;
        }
        @media (min-width: 640px) {
          .drive-links-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="settings-row" style={{ marginBottom: 16 }}>
        <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
          <h3 style={{ color: pt.cobalt, marginBottom: 8, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MegaphoneIcon color={pt.cobalt} size={17} /> Push Notification to Everyone
          </h3>
          <p style={{ color: pt.textMuted, fontSize: 13, marginBottom: 16 }}>
            Delivered instantly to every device with notifications enabled — even if they don't have the site open right now.
            You'll be asked to confirm before it sends.
          </p>
          <input placeholder="Title (e.g. New questions added!)" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} style={inStyle} />
          <textarea placeholder="Message" value={broadcastBody} onChange={e => setBroadcastBody(e.target.value)} style={{ ...inStyle, minHeight: 70, resize: 'vertical' }} />
          <button onClick={sendBroadcast} disabled={broadcastSending} style={{ ...btnStyle(pt, dark), width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {broadcastSending ? 'Sending...' : <><SendIcon color="#fff" size={13} /> Send to Everyone</>}
          </button>
        </LiquidGlassCard>

        <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
          <h3 style={{ color: pt.cobalt, marginBottom: 8, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MegaphoneIcon color={pt.cobalt} size={17} /> Home Page Announcement
          </h3>
          <p style={{ color: pt.textMuted, fontSize: 13, marginBottom: 16 }}>
            Shows in a card at the top of the Home page for everyone. Leave it empty to hide the card
            completely. The preview below is styled exactly like it'll appear on the site — same glass
            card, same text style, and it wraps onto more than one line the same way too.
          </p>
          {/* AUDIT FIX: this preview used to be a plain textarea with
              its own one-off styling (a flat cobalt/indigo gradient
              background, centered text, fontWeight 600 @ 14px) that
              had drifted out of sync with how the announcement
              actually renders on Home — a LiquidGlassCard (real
              blur + tint + shadow, not a flat gradient) with
              left-aligned text at pulseType.bodyEmphasis / 13px (see
              the announcement block in Home.tsx). Wrapping the
              textarea in the same LiquidGlassCard component with
              matching padding/typography makes what admins see here
              an accurate preview instead of a stylized guess. */}
          <LiquidGlassCard dark={dark} instant style={{ padding: '16px 20px', marginBottom: 12 }}>
            <textarea
              placeholder="e.g. Pharma exam next week, study well!"
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              style={{
                display: 'block', width: '100%', minHeight: 80, padding: 0,
                border: 'none', background: 'transparent', outline: 'none',
                ...pulseType.bodyEmphasis, fontSize: 13, color: pt.textPrimary,
                lineHeight: 1.5, textAlign: 'left', fontFamily: 'inherit',
                whiteSpace: 'normal', wordBreak: 'break-word',
                resize: 'vertical', boxSizing: 'border-box'
              }} />
          </LiquidGlassCard>
          <button onClick={saveAnnouncement} disabled={announcementSaving} style={{ ...btnStyle(pt, dark), width: '100%' }}>
            {announcementSaving ? 'Saving...' : 'Save Announcement'}
          </button>
        </LiquidGlassCard>
      </div>

      <LiquidGlassCard dark={dark} delay={0} style={{ padding: '20px 22px' }}>
        <h3 style={{ color: pt.cobalt, marginBottom: 8, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <LinkIcon color={pt.cobalt} size={17} /> Google Drive Links
        </h3>
        <p style={{ color: pt.textMuted, fontSize: 13, marginBottom: 16 }}>
          Set a different Drive folder per exam stage so students land in the right folder immediately from
          that stage's page. Leave a stage empty to fall back to the default — leave everything empty to hide
          the button entirely.
        </p>

        <label style={fieldLabel(pt)}>Default (fallback)</label>
        <input
          placeholder="https://drive.google.com/..."
          value={driveUrl}
          onChange={e => setDriveUrl(e.target.value)}
          style={{ ...inStyle, marginBottom: 16 }} />

        <div className="drive-links-grid" style={{ marginBottom: 16 }}>
          {STAGE_META.map(s => (
            <div key={s.value}>
              <label style={fieldLabel(pt)}>{s.title}</label>
              <input
                placeholder="https://drive.google.com/... (optional)"
                value={stageDriveUrls[s.value] || ''}
                onChange={e => setStageDriveUrls(prev => ({ ...prev, [s.value]: e.target.value }))}
                style={{ ...inStyle, marginBottom: 0 }} />
            </div>
          ))}
        </div>

        <button onClick={saveDriveLinks} disabled={driveUrlSaving} style={{ ...btnStyle(pt, dark), width: '100%' }}>
          {driveUrlSaving ? 'Saving...' : 'Save Drive Links'}
        </button>
      </LiquidGlassCard>
    </div>
  )
}
