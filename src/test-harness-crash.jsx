// Test-only harness proving the error boundary + fallback pattern used
// in main.jsx actually catches a crash and shows a real message,
// instead of leaving a blank page - this is the whole point of adding
// it, so it's worth proving directly rather than assuming.
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'

function CrashFallback({ resetError }) {
  return (
    <div className="empty">
      <p>Something went wrong.</p>
      <button className="btn btn-primary" onClick={() => resetError()}>
        Refresh
      </button>
    </div>
  )
}

function AlwaysThrows() {
  throw new Error('deliberate test crash')
}

const root = createRoot(document.getElementById('root'))
root.render(
  <Sentry.ErrorBoundary fallback={CrashFallback}>
    <AlwaysThrows />
  </Sentry.ErrorBoundary>
)
