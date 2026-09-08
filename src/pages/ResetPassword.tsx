// src/pages/ResetPassword.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { getPulseTheme, pulseFonts, ON_GRADIENT_TOP } from '../premiumTheme'
import PulseBackground from '../components/pulse/PulseBackground'
import PulseBrand from '../components/pulse/PulseBrand'
import { GlassField, PrimaryButton, GhostButton, AuthMessage, inputResetStyle } from '../components/pulse/AuthPrimitives'

export default function ResetPassword({ dark = true }: { dark?: boolean }) {
  const navigate = useNavigate()
  const pt = getPulseTheme(dark)
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session)
      if (!session) setMessage('❌ This reset link is invalid or expired. Please request a new one.')
    })
  }, [])

  async function handleSubmit() {
    if (!password || password.length < 8) return setMessage('❌ Password must be at least 8 characters')
    if (password !== confirm) return setMessage('❌ Passwords do not match')
    setLoading(true); setMessage('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setMessage('❌ ' + error.message)
    setMessage('✅ Password updated! Redirecting...')
    setTimeout(() => navigate('/'), 1500)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <div style={{
        position: 'relative', zIndex: 1, minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <PulseBrand dark={dark} logoSize={56} fontSize={26} />
          </div>
          {/* AUDIT FIX: this subtitle renders directly on
              PulseBackground (no glass surface behind it), but used
              to read Glass tokens (pt.sub) — a text color meant for
              text on a tinted glass backdrop. Corrected to the
              gradient-zone token for text on the light/top portion of
              PULSE_BG. */}
          <p style={{ textAlign: 'center', fontSize: 12, color: ON_GRADIENT_TOP.secondary, marginBottom: 20, fontFamily: pulseFonts.body }}>
            Set a new password
          </p>

          <AuthMessage dark={dark} message={message} />

          {ready ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <GlassField dark={dark}>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="New password (min 6 characters)" style={inputResetStyle(pt)} />
              </GlassField>
              <GlassField dark={dark}>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="Confirm new password" style={inputResetStyle(pt)} />
              </GlassField>
              <PrimaryButton pt={pt} disabled={loading} onClick={handleSubmit}>
                {loading ? 'Saving...' : 'Save New Password'}
              </PrimaryButton>
            </div>
          ) : (
            <GhostButton dark={dark} onClick={() => navigate('/auth')}>← Back to Sign In</GhostButton>
          )}
        </div>
      </div>
    </div>
  )
}
