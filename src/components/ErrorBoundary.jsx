import { Component } from 'react'
import { WarningIcon, RefreshIcon } from './ui/tool-icons'

// Catches any render-time crash anywhere below it in the tree and shows
// a friendly recoverable screen instead of leaving the page blank
// white (React unmounts the whole tree above the nearest boundary when
// an error isn't caught — without this, one bad component can blank
// the entire app). Wrapped once around the routed pages in App.jsx.
//
// BUG FIX: `hasError` used to never reset once set, since this
// component never unmounts on client-side navigation. That meant one
// render crash on any page permanently showed this fallback for every
// route visited afterward, until a full manual reload. App.jsx now
// passes `resetKey={location.pathname}` — whenever the route actually
// changes, componentDidUpdate below clears the error state so the new
// page gets a real chance to render.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught a render error:', error, info)
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center'
        }}>
          <div style={{ marginBottom: 16 }}><WarningIcon color="#ef4444" size={48} /></div>
          <h2 style={{ color: '#ef4444', marginBottom: 8, fontSize: 20 }}>Something went wrong</h2>
          <p style={{ color: '#94a3b8', marginBottom: 20, fontSize: 14, maxWidth: 400 }}>
            This page hit an unexpected error. Reloading usually fixes it — if it keeps happening,
            open the browser console (F12) and share what's shown there.
          </p>
          <button onClick={() => window.location.reload()} style={{
            background: '#38bdf8', color: '#0f172a', border: 'none',
            padding: '12px 24px', borderRadius: 10, cursor: 'pointer',
            fontWeight: 700, fontFamily: 'inherit', fontSize: 14,
            display: 'inline-flex', alignItems: 'center', gap: 8
          }}><RefreshIcon color="#0f172a" size={15} /> Reload Page</button>
        </div>
      )
    }
    return this.props.children
  }
}
