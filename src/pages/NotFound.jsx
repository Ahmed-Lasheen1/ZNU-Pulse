// src/pages/NotFound.jsx
import { useNavigate, useLocation } from 'react-router-dom'
import { getPulseTheme, pulseFonts } from '../premiumTheme'
import PulseBackground from '../components/pulse/PulseBackground'
import LiquidGlassCard from '@/components/ui/liquid-glass-card'
import { CompassIcon } from '../components/ui/tool-icons'

export default function NotFound({ dark }) {
  const pt = getPulseTheme(dark)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div style={{ position: 'relative', minHeight: '100dvh' }}>
      <PulseBackground />
      <div style={{
        position: 'relative', zIndex: 1, minHeight: '100dvh',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <LiquidGlassCard dark={dark} delay={0} style={{ padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <CompassIcon color={pt.cobalt} size={56} />
            </div>
            <h1 style={{ color: pt.cobalt, fontSize: 22, fontWeight: 800, marginBottom: 8, fontFamily: pulseFonts.display }}>
              Page not found
            </h1>
            <p style={{ color: pt.sub, marginBottom: 8, fontSize: 14, fontFamily: pulseFonts.body }}>
              There's nothing at <code style={{ color: pt.text }}>{location.pathname}</code>.
            </p>
            <p style={{ color: pt.textMuted, marginBottom: 24, fontSize: 13, fontFamily: pulseFonts.body }}>
              It may have been moved, or the link might be outdated.
            </p>
            <button onClick={() => navigate('/')} style={{
              background: pt.cobalt, color: '#fff', border: 'none',
              padding: '12px 24px', borderRadius: 999, cursor: 'pointer',
              fontWeight: 700, fontFamily: pulseFonts.body, fontSize: 14
            }}>← Back to Home</button>
          </LiquidGlassCard>
        </div>
      </div>
    </div>
  )
}
