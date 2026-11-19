import { useState, useEffect } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { supabase } from '@/core/supabase'
import { getPulseTheme, pulseType } from '@/shared/theme/premiumTheme'
import InlineMessage from '@/shared/ui/feedback/InlineMessage'
import LiquidGlassCard from '@/shared/ui/glass/liquid-glass-card'
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog'
import AdminFormCard from '@/features/admin/common/AdminFormCard'
import { inStyle as adminInStyle, fieldLabel } from '@/features/admin/common/adminStyles'
import { useAdminMessage } from '@/features/admin/common/useAdminMessage'
import { invalidateDriveUrlCache } from '@/services/content/siteSettings'
import { invalidateHomeAnnouncement } from '@/services/content/homeData'
import {
  fetchSemesterOverview, startNewSemester, nextSemesterName, invalidateCurrentSemester,
  type SemesterOverview,
} from '@/services/leaderboard/leaderboard'
import { plural } from '@/shared/utils/format'
import { MegaphoneIcon, SendIcon, LinkIcon, CalendarDotIcon } from '@/shared/icons/tool-icons'

interface SettingsTabProps {
  dark: boolean
}

const ANNOUNCEMENT_PREVIEW_MAX_WIDTH = 380
const SEMESTER_NAME_MAX_LENGTH = 30

// Admin settings: push broadcast, home announcement, semester control and the Drive link.
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
  const [semester, setSemester] = useState<SemesterOverview | null>(null)
  const [semesterError, setSemesterError] = useState('')
  const [nextName, setNextName] = useState('')
  const [semesterStarting, setSemesterStarting] = useState(false)
  const [confirmSemesterOpen, setConfirmSemesterOpen] = useState(false)

  // Loads the announcement and the Drive link.
  useEffect(() => {
    let ignore = false
    supabase.from('site_settings').select('key, value').in('key', ['home_announcement', 'drive_url']).then(({ data }) => {
      if (ignore || !data) return
      const byKey = Object.fromEntries(data.map((r: any) => [r.key, r.value || '']))
      setAnnouncement(byKey['home_announcement'] || '')
      setDriveUrl(byKey['drive_url'] || '')
    })
    return () => { ignore = true }
  }, [])

  // Loads the semester overview; the suggested next name is filled in only while the field is empty.
  async function loadSemester(isIgnored: () => boolean = () => false) {
    const { data, error } = await fetchSemesterOverview()
    if (isIgnored()) return
    if (error || !data) {
      setSemesterError(error?.message || "Couldn't load the semester")
      return
    }
    setSemesterError('')
    setSemester(data)
    setNextName(prev => prev || nextSemesterName(data.semester_name))
  }

  // Loads the semester card when the tab opens.
  useEffect(() => {
    let ignore = false
    loadSemester(() => ignore)
    return () => { ignore = true }
  }, [])

  // Saves the Home announcement text.
  async function saveAnnouncement() {
    setAnnouncementSaving(true)
    const { error } = await supabase.from('site_settings').upsert({ key: 'home_announcement', value: announcement.trim() })
    setAnnouncementSaving(false)
    if (!error) invalidateHomeAnnouncement()
    showMessage(error ? '❌ ' + error.message : '✅ Announcement updated!')
  }

  // Saves the Google Drive link.
  async function saveDriveUrl() {
    setDriveUrlSaving(true)
    const { error } = await supabase.from('site_settings').upsert({ key: 'drive_url', value: driveUrl.trim() })
    setDriveUrlSaving(false)
    if (!error) invalidateDriveUrlCache()
    showMessage(error ? '❌ ' + error.message : '✅ Drive link updated!')
  }

  // Validates the push message and asks for confirmation.
  function requestBroadcast() {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return showMessage('❌ Please fill in both fields')
    setConfirmBroadcastOpen(true)
  }

  // Sends the push notification to every subscribed device.
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

  // Checks the new semester name and asks for confirmation.
  function requestSemesterStart() {
    if (!semester) return
    const name = nextName.trim()
    if (!name) return showMessage('❌ Enter a name for the new semester')
    if (name.length > SEMESTER_NAME_MAX_LENGTH) return showMessage(`❌ Keep the name under ${SEMESTER_NAME_MAX_LENGTH} characters`)
    if (name.toLowerCase() === semester.semester_name.toLowerCase()) return showMessage('❌ The new semester needs a different name')
    if (semester.past.some(p => p.semester.toLowerCase() === name.toLowerCase())) return showMessage(`❌ ${name} was already used`)
    if (semester.scorers === 0) return showMessage('❌ Nobody has points this semester yet')
    setConfirmSemesterOpen(true)
  }

  // Saves the standings, resets semester points and switches to the new semester.
  async function confirmSemesterStart() {
    if (!semester) return
    const finished = semester.semester_name
    const name = nextName.trim()
    setConfirmSemesterOpen(false)
    setSemesterStarting(true)
    const { data, error } = await startNewSemester(finished, name)
    setSemesterStarting(false)
    if (error) {
      showMessage('❌ ' + error.message)
      loadSemester()
      return
    }
    invalidateCurrentSemester()
    showMessage(`✅ ${name} started — ${plural(data ?? 0, 'student')} saved to ${finished} history`)
    await loadSemester()
    setNextName(nextSemesterName(name))
  }

  const semesterPill = {
    background: `${pt.cobalt}22`, color: pt.cobalt, border: `1px solid ${pt.cobaltBorder}`,
    borderRadius: 999, padding: '4px 14px', fontWeight: 800, fontSize: 15,
  } as const

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

      <MotionConfig reducedMotion="user">
        <div style={{ marginBottom: 16 }}>
          <AdminFormCard
            dark={dark}
            title="Semester"
            Icon={CalendarDotIcon}
            description="Starting a new semester saves the current standings to history, resets everyone's semester points to 0 and switches the leaderboard to the new name. Lifetime points are never touched."
            addLabel="Start new semester"
            savingLabel="Starting..."
            saving={semesterStarting}
            disabled={!semester || semester.scorers === 0}
            onSave={requestSemesterStart}
          >
            {semester ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span style={{ ...fieldLabel(pt), marginBottom: 0 }}>Current semester</span>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={semester.semester_name || 'none'}
                      initial={{ opacity: 0, y: -10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      transition={{ duration: 0.25 }}
                      style={semesterPill}
                    >{semester.semester_name || '—'}</motion.span>
                  </AnimatePresence>
                  <span style={{ color: pt.textMuted, fontSize: 12 }}>{plural(semester.scorers, 'student')} with points</span>
                </div>

                <label style={fieldLabel(pt)}>Name of the next semester</label>
                <input
                  placeholder="e.g. S4"
                  value={nextName}
                  maxLength={SEMESTER_NAME_MAX_LENGTH}
                  onChange={e => setNextName(e.target.value)}
                  style={inStyle}
                />

                {semester.past.length > 0 && (
                  <div>
                    <label style={fieldLabel(pt)}>Past semesters</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {semester.past.map((item, i) => (
                        <motion.span
                          key={item.semester}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.25, delay: i * 0.05 }}
                          style={{
                            border: `1px solid ${pt.border}`, borderRadius: 999, padding: '4px 12px',
                            color: pt.textSecondary, fontSize: 12, fontWeight: 700,
                          }}
                        >{item.semester} · {plural(item.students, 'student')}</motion.span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: pt.textMuted, fontSize: 13 }}>{semesterError || 'Loading...'}</p>
            )}
          </AdminFormCard>
        </div>
      </MotionConfig>

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

      <ConfirmDialog
        dark={dark}
        open={confirmSemesterOpen}
        title={`Start ${nextName.trim()}?`}
        message={`Save the ${semester?.semester_name ?? ''} standings (${plural(semester?.scorers ?? 0, 'student')}), reset everyone's semester points to 0 and start ${nextName.trim()}? Lifetime points are not affected.`}
        confirmLabel="Start semester"
        confirmColor={pt.cobalt}
        onCancel={() => setConfirmSemesterOpen(false)}
        onConfirm={confirmSemesterStart}
      />
    </div>
  )
}
