import { test, expect } from '@playwright/test'

// This is the single most important test in this suite. A real
// production incident happened once: state declared in one component,
// used in a different one, a valid build gave false confidence, and
// the result was a blank white screen after login. A build passing
// never catches this class of bug - only an actual render does. This
// test exists specifically so that can never silently happen again.

test('Main renders with real data and zero console errors', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [
        {
          id: 'w1',
          date: '2026-07-20',
          split: null,
          notes: null,
          started_at: '2026-07-20T09:00:00.000Z',
          finished_at: '2026-07-20T09:30:00.000Z',
          exercises: [
            {
              name: 'Bench Press',
              notes: null,
              superset_group: null,
              sets: [{ weight: 60, unit: 'kg', reps: 10, per_side: false, side: null, feel: 'ok', warmup: false }],
            },
          ],
        },
      ],
      profile: { goals: ['strength'], goal_note: null, height_cm: null },
      templates: [],
      bodyMetrics: [],
      exerciseTargets: {},
    }
  })

  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.waitForTimeout(500)

  expect(errors).toEqual([])

  const rootHtml = await page.evaluate(() => document.getElementById('root').innerHTML)
  expect(rootHtml.length).toBeGreaterThan(100)
})

test('starting a new workout renders the editor with zero errors', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = { workouts: [], profile: null, templates: [], bodyMetrics: [], exerciseTargets: {} }
  })

  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.locator('.fab').click()
  await page.waitForTimeout(300)

  expect(errors).toEqual([])
  await expect(page.locator('.exercise-block').first()).toBeVisible()
})

// This test exists specifically because Progress/Trends/GoalProgress/
// Settings/Goals are lazy-loaded - this is the exact code path that
// touches, and nothing else in this suite navigates there at all.
test('navigating to Progress and Settings tabs loads the lazy chunks with zero errors', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [
        {
          id: 'w1', date: '2026-07-20', split: null, notes: null,
          started_at: null, finished_at: null,
          exercises: [{ name: 'Bench Press', notes: null, superset_group: null, sets: [
            { weight: 60, unit: 'kg', reps: 10, per_side: false, side: null, feel: 'ok', warmup: false },
          ] }],
        },
      ],
      profile: { goals: ['strength'], goal_note: null, height_cm: null },
      templates: [],
      bodyMetrics: [],
      exerciseTargets: {},
    }
  })

  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })

  await page.getByRole('button', { name: 'Progress', exact: true }).click()
  await page.waitForTimeout(500)
  expect(errors).toEqual([])

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.waitForTimeout(500)
  expect(errors).toEqual([])
})
