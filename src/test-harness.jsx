// Permanent test harness - not a production entry point. Vite only
// builds index.html by default, so this file and test-harness.html
// are never included in `npm run build` output.
//
// Each test sets window.__TEST_MOCK__ via page.addInitScript() BEFORE
// navigating here, so this one harness works for every Main-based
// test rather than needing a new harness file per scenario. See
// tests/README.md for the exact shape of __TEST_MOCK__.
//
// userEmail is optional and defaults to 'test@example.com' - only set
// it when a test specifically needs to check email-gated behavior
// (e.g. the roadmap debug panel).
import { createRoot } from 'react-dom/client'
import { Main } from './App'

const overrideEmail = typeof window !== 'undefined' ? window.__TEST_MOCK__?.userEmail : undefined
const root = createRoot(document.getElementById('root'))
root.render(<Main user={{ id: 'test-user', email: overrideEmail || 'test@example.com' }} />)
