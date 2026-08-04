import { test, expect } from '@playwright/test'

test('a beginner with a roadmap sees the Roadmap tab, showing their current stage', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner', goal_priority: ['strength'],
      },
      roadmapProgress: { stage: 1, started_at: new Date().toISOString(), graduated_at: null },
      templates: [], bodyMetrics: [], exerciseTargets: {},
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })

  await expect(page.getByRole('button', { name: 'Roadmap' })).toBeVisible()
  await page.getByRole('button', { name: 'Roadmap' }).click()

  await expect(page.locator('text=Stage 1 of 3')).toBeVisible()
  await expect(page.locator('text=Learn the Lifts').first()).toBeVisible()
  await expect(page.locator('text=0 of 3 days logged')).toBeVisible()
  // strength goal -> 5x5, not the general-fitness default
  await expect(page.locator('text=Dumbbell Squat')).toBeVisible()
  await expect(page.locator('text=5 reps × 5 sets').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('Start today\'s session opens the workout editor pre-filled with the Stage 1 exercises', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner', goal_priority: ['lose_fat'],
      },
      roadmapProgress: { stage: 1, started_at: new Date().toISOString(), graduated_at: null },
      templates: [], bodyMetrics: [], exerciseTargets: {},
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.getByRole('button', { name: 'Roadmap' }).click()

  await expect(page.locator('text=12-15 reps × 3 sets').first()).toBeVisible() // lose_fat target, proves the goal actually drove it
  await page.getByRole('button', { name: "Start today's session" }).click()

  // Checking .toHaveValue() on the actual search inputs, not page text -
  // exercise names only ever land as input values here, and relying on
  // them incidentally appearing as literal text elsewhere (e.g. a later
  // exercise's "Link as superset with X" button) is exactly the kind of
  // assertion that looks right for 4 exercises and silently breaks on
  // the 5th, which is what happened on the first pass of this test.
  const nameInputs = page.getByPlaceholder('Search or type exercise')
  await expect(nameInputs).toHaveCount(5, { timeout: 10000 })
  await expect(nameInputs.nth(0)).toHaveValue('Dumbbell Squat')
  await expect(nameInputs.nth(1)).toHaveValue('Dumbbell Romanian Deadlift')
  await expect(nameInputs.nth(2)).toHaveValue('Push-up')
  await expect(nameInputs.nth(3)).toHaveValue('Dumbbell Bent Over Row')
  await expect(nameInputs.nth(4)).toHaveValue('Dead Bug')
  expect(errors).toEqual([])
})

test('a non-beginner does not see the Roadmap tab', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'advanced',
      },
      templates: [], bodyMetrics: [], exerciseTargets: {},
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await expect(page.getByRole('button', { name: 'Roadmap' })).toHaveCount(0)
})

test('logging enough days auto-advances the visible stage', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    const workouts = [1, 2, 3].map((d) => ({
      id: `w${d}`, date: `2026-01-0${d}`, split: null, notes: null,
      exercises: [{
        id: `e${d}`, name: 'Squat', notes: null, position: 0,
        sets: [{ id: `s${d}`, weight: 40, unit: 'kg', reps: 8, per_side: false, side: null, feel: null, warmup: false, position: 0 }],
      }],
    }))
    window.__TEST_MOCK__ = {
      workouts,
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner',
      },
      roadmapProgress: { stage: 1, started_at: '2026-01-01T00:00:00.000Z', graduated_at: null },
      templates: [], bodyMetrics: [], exerciseTargets: {},
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.getByRole('button', { name: 'Roadmap' }).click()

  await expect(page.locator('text=Stage 2 of 3')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('text=Build the Base').first()).toBeVisible()
  const advanced = await page.evaluate(() => window.__TEST_LAST_ROADMAP_STAGE__)
  expect(advanced).toBe(2)
  expect(errors).toEqual([])
})

test('graduated state shows the graduation card instead of the stage list', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner',
      },
      roadmapProgress: { stage: 3, started_at: '2020-01-01T00:00:00.000Z', graduated_at: '2026-01-01T00:00:00.000Z' },
      templates: [], bodyMetrics: [], exerciseTargets: {},
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.getByRole('button', { name: 'Roadmap' }).click()
  await expect(page.locator("text=You've graduated Beginner")).toBeVisible()
})
