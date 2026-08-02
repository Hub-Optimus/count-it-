import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import './styles.css'

// No-op entirely until VITE_SENTRY_DSN is set (see README for the one
// manual step - create a free Sentry account, add the DSN as a Vercel
// env var). Deliberately minimal: crash reporting only, no session
// replay or performance tracing, since neither was asked for and both
// add real bundle weight for a feature that isn't the point here.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.PROD ? 'production' : 'development',
    tracesSampleRate: 0,
  })
}

// A blank white screen has happened once before in this project, from
// a component-scoping mistake a passing build didn't catch. This
// error boundary means any future render crash shows an actual
// message and a way to recover, instead of a silent blank page - the
// same thing Sentry (when configured) reports so it can actually be
// fixed, not just refreshed away and forgotten.
function CrashFallback({ resetError }) {
  return (
    <div className="empty">
      <p>Something went wrong.</p>
      <button className="btn btn-primary" onClick={() => { resetError(); window.location.reload() }}>
        Refresh
      </button>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={CrashFallback}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
