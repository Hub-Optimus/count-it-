// Permanent test harness - not a production entry point. Vite only
// builds index.html by default, so this file and test-harness.html
// are never included in `npm run build` output.
//
// Each test sets window.__TEST_MOCK__ via page.addInitScript() BEFORE
// navigating here, so this one harness works for every Main-based
// test rather than needing a new harness file per scenario. See
// tests/README.md for the exact shape of __TEST_MOCK__.
import { createRoot } from 'react-dom/client'
import { Main } from './App'

const root = createRoot(document.getElementById('root'))
root.render(<Main user={{ id: 'test-user', email: 'test@example.com' }} />)
