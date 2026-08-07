// Test-only data injection for db.js. Real requests never touch this -
// it's a no-op unless a test explicitly sets window.__TEST_MOCK__
// before the app loads (see tests/README.md). This lets the Playwright
// suite in tests/ run against real rendered components with real user
// interactions, without ever hitting Supabase or needing a live
// database. Centralized here (one small file, one clear name) rather
// than scattered inline checks, so it's easy to find, understand, and
// remove entirely if this project ever moves to network-level mocking
// instead.
export function testMock() {
  return typeof window !== 'undefined' ? window.__TEST_MOCK__ : undefined
}
