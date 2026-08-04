import { test, expect } from '@playwright/test'

test('a beginner with a roadmap sees the Roadmap tab, showing their current stage', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner',
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
