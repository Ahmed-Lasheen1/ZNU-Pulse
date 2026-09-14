// src/pages/Auth.tsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Lock, Eye, EyeOff, ArrowLeft, GraduationCap, Mail } from 'lucide-react'
import { supabase } from '../supabase'
import { containsProfanity } from '../lib/moderation'
import { getPulseTheme, pulseFonts, ON_GRADIENT_TOP } from '../premiumTheme'
import PulseBackground from '../components/pulse/PulseBackground'
import PulseBrand from '../components/pulse/PulseBrand'
import {
  GlassField, PrimaryButton, GhostButton, TextLink, AccountToggle, AuthMessage, inputResetStyle
} from '../components/pulse/AuthPrimitives'

type AccountType = 'university' | 'personal'
type AuthMode = 'signin' | 'signup'
type AuthStep = 'form' | 'verify'

// Minimum password length enforced client-side for new/changed
// passwords (Supabase's HaveIBeenPwned check needs the Pro plan).
const MIN_PASSWORD_LENGTH = 8

// Anchored so an address like "student@med.znu.edu.eg.attacker.com"
// isn't accepted just because it contains the university domain.
const UNIVERSITY_EMAIL_REGEX = /^[^\s@]+@med\.znu\.edu\.eg$/i

function fireConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999 }
  confetti({ ...defaults, particleCount: 50, origin: { x: 0, y: 1 }, angle: 60 })
  confetti({ ...defaults, particleCount: 50, origin: { x: 1, y: 1 }, angle: 120 })
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001 6.19 5.238 6.19 5.238C39.836 41.075 44 34.5 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}

function OrDivider({ pt }: { pt: ReturnType<typeof getPulseTheme> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0' }}>
      <div style={{ height: 1, background: pt.border, flex: 1 }} />
      <span style={{ color: pt.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>OR</span>
      <div style={{ height: 1, background: pt.border, flex: 1 }} />
    </div>
  )
}

export default function Auth({ dark = true }: { dark?: boolean }) {
  const navigate = useNavigate()
  const pt = getPulseTheme(dark)

  const [mode, setMode] = useState<AuthMode>('signin')
  const [step, setStep] = useState<AuthStep>('form')
  const [accountType, setAccountType] = useState<AccountType>('university')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  const otpRef = useRef<HTMLInputElement>(null)
  const celebratedRef = useRef(false)

  useEffect(() => { if (step === 'verify') setTimeout(() => otpRef.current?.focus(), 300) }, [step])
  useEffect(() => {
    if (message.includes('✅') && message.toLowerCase().includes('verified') && !celebratedRef.current) {
      celebratedRef.current = true
      fireConfetti()
    }
  }, [message])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])

  function resetAll() {
    setStep('form'); setName(''); setEmail(''); setPassword(''); setConfirmPassword(''); setOtp(''); setMessage('')
  }

  async function handleGoogleSignIn() {
    setMessage('')
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      }
    })
    if (error) {
      setGoogleLoading(false)
      setMessage('❌ ' + error.message)
    }
  }

  async function handleSignInSubmit() {
    setMessage('')
    if (!email.trim()) return setMessage('❌ Please enter your email')
    if (!password) return setMessage('❌ Please enter your password')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) setMessage('❌ ' + error.message)
    else navigate('/')
  }

  async function handleSignupSubmit() {
    setMessage('')
    const cleanEmail = email.trim()
    const valid = accountType === 'university'
      ? UNIVERSITY_EMAIL_REGEX.test(cleanEmail)
      : /^[^\s@]+@gmail\.com$/i.test(cleanEmail)
    if (!valid) return setMessage(accountType === 'university' ? '❌ Please use your ZNU email (@med.znu.edu.eg)' : '❌ Please enter a valid Gmail address')
    if (!name.trim()) return setMessage('❌ Please enter your name')
    if (containsProfanity(name)) return setMessage('❌ Please choose an appropriate name')
    if (containsProfanity(cleanEmail.split('@')[0])) return setMessage('❌ The email contains inappropriate words')
    if (!password || password.length < MIN_PASSWORD_LENGTH) return setMessage(`❌ Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    if (!confirmPassword || confirmPassword.length < MIN_PASSWORD_LENGTH) return setMessage('❌ Please confirm your password')
    if (password !== confirmPassword) return setMessage('❌ Passwords do not match')

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail, password,
      options: { data: { name: name.trim(), account_type: accountType } }
    })

    if (error) { setLoading(false); return setMessage('❌ ' + error.message) }

    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: cleanEmail })
      setLoading(false)
      if (resendError) return setMessage('❌ ' + resendError.message)
      setMessage('✅ This email was already pending verification — a fresh code was sent.')
      setStep('verify')
      return
    }
    setLoading(false)
    setStep('verify')
  }

  async function handleVerify() {
    if (!otp || otp.trim().length < 6) return setMessage('❌ Please enter the 6-digit code')
    setMessage('')
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: 'signup' })
    setLoading(false)
    if (error) return setMessage('❌ ' + error.message)
    setMessage('✅ Account verified! Welcome aboard.')
    setTimeout(() => navigate('/'), 900)
  }

  async function handleResend() {
    setLoading(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
    setLoading(false)
    setMessage(error ? '❌ ' + error.message : '✅ A new code was sent — check spam too.')
  }

  async function handleForgotPassword() {
    if (!email.trim()) return setMessage('Please enter your email address first')
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    setLoading(false)
    setMessage(error ? '❌ ' + error.message : '✅ Check your email for a reset link (check spam too).')
  }

  const handleSubmit = mode === 'signin' ? handleSignInSubmit : handleSignupSubmit

  const googleButton = (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={googleLoading || loading}
      style={{
        width: '100%', padding: '13px', borderRadius: 999,
        background: '#fff', border: '1px solid rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer',
        opacity: (googleLoading || loading) ? 0.7 : 1,
        fontFamily: pulseFonts.body, fontWeight: 700, fontSize: 14, color: '#1f1f1f',
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)'
      }}
    >
      <GoogleIcon size={18} />
      {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
    </button>
  )

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <PulseBackground />
      <style>{`
        .auth-grid { display: flex; align-items: center; justify-content: center; gap: 60px; max-width: 1100px; margin: 0 auto; padding: 40px 24px; }
        .auth-brand-panel { display: none; }
        @media (min-width: 1024px) {
          .auth-brand-panel { display: flex; flex: 1; max-width: 480px; flex-direction: column; align-items: flex-start; gap: 18px; }
        }
        .auth-form-panel { width: 100%; max-width: 420px; }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <div className="auth-grid">
          <div className="auth-brand-panel">
            <PulseBrand dark={dark} logoSize={72} fontSize={40} />
            <p style={{ color: pt.sub, fontSize: 16, lineHeight: 1.6, maxWidth: 420, fontFamily: pulseFonts.body }}>
              Your integrated medical study companion — schedules, checklists, MCQ banks, and smart summaries, all in one place.
            </p>
          </div>

          <div className="auth-form-panel">
            {!isDesktop && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <PulseBrand dark={dark} logoSize={56} fontSize={26} />
              </div>
            )}

            <AuthMessage dark={dark} message={message} />

            {step === 'verify' ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ textAlign: 'center', fontSize: 12, color: ON_GRADIENT_TOP.secondary, fontFamily: pulseFonts.body }}>
                  We sent a 6-digit code to <strong style={{ color: ON_GRADIENT_TOP.primary }}>{email}</strong>
                </p>
                <GlassField dark={dark}>
                  <input ref={otpRef} inputMode="numeric" maxLength={6} value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleVerify()}
                    placeholder="123456" name="otp" autoComplete="one-time-code"
                    style={inputResetStyle(pt, { textAlign: 'center', fontSize: 22, fontWeight: 800, letterSpacing: 8 })} />
                </GlassField>
                <PrimaryButton pt={pt} disabled={loading} onClick={handleVerify}>{loading ? 'Verifying...' : 'Verify & Continue'}</PrimaryButton>
                <GhostButton dark={dark} onClick={handleResend}>Resend code</GhostButton>
                <div style={{ textAlign: 'center' }}>
                  <TextLink pt={pt} muted onClick={() => setStep('form')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={13} /> Go back</span>
                  </TextLink>
                </div>
              </motion.div>
            ) : mode === 'signin' ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 22, fontWeight: 300, color: ON_GRADIENT_TOP.primary, textAlign: 'center', fontFamily: pulseFonts.display }}>Welcome back</p>

                {googleButton}
                <OrDivider pt={pt} />

                <GlassField dark={dark}>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="Email address" name="email" autoComplete="username" inputMode="email"
                    style={inputResetStyle(pt)} />
                </GlassField>

                <GlassField dark={dark}>
                  <Lock size={15} color={pt.faint} style={{ flexShrink: 0 }} />
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="Password" name="password" autoComplete="current-password"
                    style={inputResetStyle(pt)} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: pt.sub, flexShrink: 0 }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </GlassField>

                <div style={{ textAlign: 'right' }}>
                  <TextLink pt={pt} onClick={handleForgotPassword}>Forgot password?</TextLink>
                </div>

                <PrimaryButton pt={pt} disabled={loading} onClick={handleSubmit}>{loading ? 'Signing in...' : 'Sign In'}</PrimaryButton>

                <GhostButton dark={dark} onClick={() => { setMode('signup'); resetAll() }}>Don't have an account? Sign Up</GhostButton>
                <div style={{ textAlign: 'center' }}>
                  <TextLink pt={pt} muted onClick={() => navigate('/')}>Continue without account →</TextLink>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 22, fontWeight: 300, color: ON_GRADIENT_TOP.primary, textAlign: 'center', fontFamily: pulseFonts.display }}>Create your account</p>

                {googleButton}
                <OrDivider pt={pt} />

                <div style={{ display: 'flex', gap: 8 }}>
                  <AccountToggle dark={dark} pt={pt} active={accountType === 'university'} onClick={() => { setAccountType('university'); setEmail('') }}>
                    <GraduationCap size={14} /> University
                  </AccountToggle>
                  <AccountToggle dark={dark} pt={pt} active={accountType === 'personal'} onClick={() => { setAccountType('personal'); setEmail('') }}>
                    <Mail size={14} /> Personal Gmail
                  </AccountToggle>
                </div>

                <GlassField dark={dark}>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" name="name" autoComplete="name" style={inputResetStyle(pt)} />
                </GlassField>

                <GlassField dark={dark}>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={accountType === 'university' ? 'ZNU email (@med.znu.edu.eg)' : 'you@gmail.com'}
                    name="signup-email" autoComplete="username" inputMode="email" style={inputResetStyle(pt)} />
                </GlassField>

                <GlassField dark={dark}>
                  <Lock size={15} color={pt.faint} style={{ flexShrink: 0 }} />
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={`Password (min ${MIN_PASSWORD_LENGTH} characters)`} name="password" autoComplete="new-password"
                    style={inputResetStyle(pt)} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: pt.sub, flexShrink: 0 }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </GlassField>

                <GlassField dark={dark}>
                  <Lock size={15} color={pt.faint} style={{ flexShrink: 0 }} />
                  <input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="Confirm password" name="confirm-password" autoComplete="new-password"
                    style={inputResetStyle(pt)} />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: pt.sub, flexShrink: 0 }}>
                    {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </GlassField>

                <PrimaryButton pt={pt} disabled={loading} onClick={handleSubmit}>{loading ? 'Creating account...' : 'Create Account'}</PrimaryButton>

                <GhostButton dark={dark} onClick={() => { setMode('signin'); resetAll() }}>Already have an account? Sign In</GhostButton>
                <div style={{ textAlign: 'center' }}>
                  <TextLink pt={pt} muted onClick={() => navigate('/')}>Continue without account →</TextLink>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
