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

test('quick-log: checking off an exercise and finishing saves a real workout', async ({ page }) => {
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

  // Nothing logged yet - Finish stays disabled, no forcing a full session
  await expect(page.getByRole('button', { name: 'Finish session' })).toBeDisabled()

  // Type weight for the first exercise only, leave reps at its default, check it off
  await page.getByLabel('Dumbbell Squat weight').fill('20')
  await page.getByRole('button', { name: 'Mark Dumbbell Squat done' }).click()

  await expect(page.locator('text=1 of 5 logged')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo Dumbbell Squat' })).toBeVisible()

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

test('quick-log requires a real weight before allowing a check-off', async ({ page }) => {
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

  // No weight typed - tapping check should not mark it done
  await page.getByRole('button', { name: 'Mark Dumbbell Squat done' }).click()
  await expect(page.getByRole('button', { name: 'Mark Dumbbell Squat done' })).toBeVisible()
  await expect(page.locator('text=1 of 5 logged')).toHaveCount(0)
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
