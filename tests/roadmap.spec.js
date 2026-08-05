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
  await expect(page.locator('.quick-log-name', { hasText: 'Dumbbell Squat' })).toBeVisible()
  await expect(page.locator('text=5 reps × 5 sets').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('quick-log: stepping through, checking off one exercise, skipping the rest, and finishing saves a real workout', async ({ page }) => {
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

  // Step 1 (Dumbbell Squat) is hosted first, on its own
  await expect(page.locator('.quick-log-name', { hasText: 'Dumbbell Squat' })).toBeVisible()
  await page.getByLabel('Dumbbell Squat weight').fill('20')
  await page.getByRole('button', { name: 'Check off & next' }).click()

  // Advances to step 2 automatically, counter reflects the one logged so far
  await expect(page.locator('text=1 of 5 logged')).toBeVisible()
  await expect(page.locator('.quick-log-name', { hasText: 'Dumbbell Romanian Deadlift' })).toBeVisible()

  // Skip the remaining 4 to reach the summary without logging them
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Skip for now' }).click()
  }

  // Partial sessions are allowed - Finish enables with just 1 logged
  const finishBtn = page.getByRole('button', { name: 'Finish session (1)' })
  await expect(finishBtn).toBeEnabled()
  await finishBtn.click()

  const saved = await page.evaluate(() => window.__TEST_LAST_SAVE__)
  expect(saved.exercises).toHaveLength(1)
  expect(saved.exercises[0].name).toBe('Dumbbell Squat')
  expect(saved.exercises[0].sets[0].weight).toBe(20)
  expect(saved.exercises[0].sets[0].reps).toBe(13) // lose_fat default reps, never typed - proves the pre-fill actually worked
  expect(errors).toEqual([])
})

test('quick-log requires a real weight before advancing via Check off', async ({ page }) => {
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
  await page.getByRole('button', { name: 'Roadmap' }).click()

  // No weight typed - Check off should not advance to the next step
  await page.getByRole('button', { name: 'Check off & next' }).click()
  await expect(page.locator('.quick-log-name', { hasText: 'Dumbbell Squat' })).toBeVisible()
  await expect(page.locator('text=1 of 5 logged')).toHaveCount(0)

  // Skip always works regardless of weight - it's the deliberate escape hatch
  await page.getByRole('button', { name: 'Skip for now' }).click()
  await expect(page.locator('.quick-log-name', { hasText: 'Dumbbell Romanian Deadlift' })).toBeVisible()
})

test('quick-log: completing all 5 steps sequentially saves a full workout', async ({ page }) => {
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
  await page.getByRole('button', { name: 'Roadmap' }).click()

  const names = ['Dumbbell Squat', 'Dumbbell Romanian Deadlift', 'Push-up', 'Dumbbell Bent Over Row', 'Dead Bug']
  for (const name of names) {
    await expect(page.locator('.quick-log-name', { hasText: name })).toBeVisible()
    await page.getByLabel(`${name} weight`).fill('20')
    await page.getByRole('button', { name: 'Check off & next' }).click()
  }

  await expect(page.locator('text=5 of 5 logged')).toBeVisible()
  const finishBtn = page.getByRole('button', { name: 'Finish session (5)' })
  await expect(finishBtn).toBeEnabled()
  await finishBtn.click()

  await expect(page.locator('text=Session logged')).toBeVisible()
  const saved = await page.evaluate(() => window.__TEST_LAST_SAVE__)
  expect(saved.exercises).toHaveLength(5)
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

test('debug panel never appears for a normal account', async ({ page }) => {
  await page.addInitScript(() => {
    // Default test-harness email ('test@example.com') - deliberately
    // NOT the debug account, to prove the gate actually excludes everyone else.
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
  await page.getByRole('button', { name: 'Roadmap' }).click()
  await expect(page.locator('.roadmap-debug-panel')).toHaveCount(0)
})

test('debug panel appears for the test account and can jump stages instantly', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      userEmail: 'prakashkoulagi.official@gmail.com',
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
  await page.getByRole('button', { name: 'Roadmap' }).click()

  await expect(page.locator('.roadmap-debug-panel')).toBeVisible()
  await expect(page.locator('text=Stage 1 of 3')).toBeVisible()

  await page.getByRole('button', { name: 'Jump to Stage 2' }).click()
  await expect(page.locator('text=Stage 2 of 3')).toBeVisible()
  await expect(page.locator('text=Build the Base').first()).toBeVisible()

  await page.getByRole('button', { name: 'Force graduate now' }).click()
  await expect(page.locator("text=You've graduated Beginner")).toBeVisible()
  // Debug panel survives into the graduated view too - still testable from there
  await expect(page.locator('.roadmap-debug-panel')).toBeVisible()

  await page.getByRole('button', { name: 'Reset to Day 1 (undo everything above)' }).click()
  await expect(page.locator('text=Stage 1 of 3')).toBeVisible()
  await expect(page.locator('text=Learn the Lifts').first()).toBeVisible()

  expect(errors).toEqual([])
})
