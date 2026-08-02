# Tests

Real Playwright tests that render the actual app and interact with it
like a person would - not unit tests of isolated functions. This
exists because every "confirmed working" claim from a chat session
disappears the moment that conversation ends; nothing in the codebase
itself used to guarantee a past fix stayed fixed. These tests are that
guarantee, going forward.

## Running

```
npm test
```

That's it - `playwright.config.js` starts the dev server automatically
and shuts it down when done. No separate setup needed.

To watch it run in a real browser instead of headless:

```
npx playwright test --headed
```

To run just one file:

```
npx playwright test tests/track-sides.spec.js
```

## How this works without a real Supabase connection

Two permanent test harnesses live in `src/`:

- `src/test-harness.jsx` (+ `test-harness.html`) renders the full app
  (`Main`, exported from `App.jsx` specifically for this)
- `src/test-harness-editor.jsx` (+ `test-harness-editor.html`) renders
  `WorkoutEditor` directly, skipping the dashboard

Neither is a production entry point - Vite only builds `index.html` by
default, so `npm run build` never includes these.

Each test sets mock data via `page.addInitScript()` *before*
navigating to the harness:

- For `test-harness.html`, set `window.__TEST_MOCK__` - see
  `src/lib/testMock.js` for exactly which `db.js` functions read it,
  and `tests/smoke.spec.js` for the full expected shape (workouts,
  profile, templates, bodyMetrics, exerciseTargets).
- For `test-harness-editor.html`, set `window.__TEST_PROPS__` with
  whatever props `WorkoutEditor` needs - see
  `src/test-harness-editor.jsx` for the full prop list.

Writes (`insertFullWorkout`, `updateFullWorkout`, `saveTemplate`) are
also mocked - they capture what was passed on
`window.__TEST_LAST_SAVE__` instead of hitting Supabase, so a test can
assert on the actual data that would have been saved.

## Adding a new test

1. Pick the right harness (full app for anything involving navigation
   or the dashboard, the editor harness for anything that's purely
   about logging a set)
2. Set mock data via `addInitScript`
3. Interact with the page the way a person would
4. Always assert `page.on('pageerror', ...)` stays empty - a passing
   assertion doesn't catch a silent crash elsewhere on the page

One real lesson from this project worth repeating: an early attempt at
testing the stopwatch with Playwright's simulated/virtual clock showed
it as broken (only counted 1 tick instead of 45). It wasn't - it was a
quirk of the virtual clock's interaction with `setInterval`. Real
`page.waitForTimeout()` wall-clock waits confirmed the feature was
fine. If a timer/interval-based test looks broken only under a
simulated clock, verify with real time before trusting it.
