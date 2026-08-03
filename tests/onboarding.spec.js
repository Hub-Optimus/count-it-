import { test, expect } from '@playwright/test'

// Covers the gate itself (not-yet-onboarded users, new or existing, land
// on the wizard instead of the main app) plus a full click-through of all
// three steps, ending in the real save path (profiles upsert + a
// body_metrics row for starting weight) via the test mock.

test('user without onboarding_completed_at sees the wizard, not the main app', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      // Existing user shape: already has goals/height from the old
      // onboarding, but never answered the new questions.
      profile: { goals: ['strength'], goal_note: null, height_cm: 178, onboarding_completed_at: null },
      templates: [], bodyMetrics: [], exerciseTargets: {},
    }
  })
  await page.goto('/test-harness.html')

  await expect(page.locator('text=A few basics')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('text=Workouts')).not.toBeVisible()
  expect(errors).toEqual([])
})

test('completing all three steps saves and lands on the main app', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: { goals: [], goal_note: null, height_cm: null, onboarding_completed_at: null },
      templates: [], bodyMetrics: [], exerciseTargets: {},
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=A few basics', { timeout: 10000 })

  // Step 1 - clicking Continue with nothing filled shows exactly what's missing
  const continueBtn = page.getByRole('button', { name: 'Continue' })
  await continueBtn.click()
  await expect(page.locator('.error')).toContainText('Date of birth')
  await expect(page.locator('.error')).toContainText('Sex')
  await expect(page.locator('.error')).toContainText('Height')
  await expect(page.locator('.error')).toContainText('Current weight')

  await page.locator('input[type="date"]').fill('1995-06-15')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.locator('input[placeholder="e.g. 175"]').fill('178')
  await page.locator('input[placeholder="weight"]').fill('75')
  // Error clears as soon as the fields are filled in, before Continue is clicked again
  await expect(page.locator('.error')).not.toBeVisible()
  await continueBtn.click()

  // Step 2
  await expect(page.locator('text=What are you working toward?')).toBeVisible()
  const continueBtn2 = page.getByRole('button', { name: 'Continue' })

  await page.getByRole('button', { name: 'Build muscle' }).click()
  // Weight-relevant goal picked - a target weight field should now appear
  await expect(page.locator('text=Target weight (optional)')).toBeVisible()

  await page.getByRole('button', { name: 'Moderate · 3-4 days/week' }).click()
  await page.getByRole('button', { name: 'Intermediate · 6 months - 2 years' }).click()
  await page.getByRole('button', { name: 'Gym' }).click()
  await page.getByRole('button', { name: 'No', exact: true }).click()
  await continueBtn2.click()

  // Step 3 - everything optional, Finish should work with nothing filled
  await expect(page.locator('text=A few optional details')).toBeVisible()
  await page.getByRole('button', { name: 'Finish' }).click()

  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  expect(errors).toEqual([])

  const saved = await page.evaluate(() => window.__TEST_LAST_SAVE__)
  expect(saved.dateOfBirth).toBe('1995-06-15')
  expect(saved.sex).toBe('male')
  expect(saved.heightCm).toBe(178)
  expect(saved.weight).toBe(75)
  expect(saved.goalPriority).toEqual(['build_muscle'])
  expect(saved.hasTrainer).toBe(false)

  const bodyMetric = await page.evaluate(() => window.__TEST_LAST_BODY_METRIC__)
  expect(bodyMetric.weight).toBe(75)
  expect(bodyMetric.weightUnit).toBe('kg')
})

test('goals are rank-ordered by tap order, and removing one renumbers the rest', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: { goals: [], goal_note: null, height_cm: null, onboarding_completed_at: null },
      templates: [], bodyMetrics: [], exerciseTargets: {},
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=A few basics', { timeout: 10000 })

  await page.locator('input[type="date"]').fill('1995-06-15')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.locator('input[placeholder="e.g. 175"]').fill('178')
  await page.locator('input[placeholder="weight"]').fill('75')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.locator('text=What are you working toward?')).toBeVisible()

  // Tap out of definition order - rank should follow tap order, not list order
  await page.getByRole('button', { name: 'Build endurance' }).click()
  await page.getByRole('button', { name: 'Lose fat' }).click()
  await page.getByRole('button', { name: 'Get stronger' }).click()

  const enduranceChip = page.locator('button.chip', { hasText: 'Build endurance' })
  const loseFatChip = page.locator('button.chip', { hasText: 'Lose fat' })
  const strengthChip = page.locator('button.chip', { hasText: 'Get stronger' })
  await expect(enduranceChip.locator('.chip-rank')).toHaveText('1')
  await expect(loseFatChip.locator('.chip-rank')).toHaveText('2')
  await expect(strengthChip.locator('.chip-rank')).toHaveText('3')

  // Tapping an already-selected goal removes it and renumbers the rest
  await loseFatChip.click()
  await expect(loseFatChip.locator('.chip-rank')).toHaveCount(0)
  await expect(enduranceChip.locator('.chip-rank')).toHaveText('1')
  await expect(strengthChip.locator('.chip-rank')).toHaveText('2')

  await page.getByRole('button', { name: 'Moderate · 3-4 days/week' }).click()
  await page.getByRole('button', { name: 'Intermediate · 6 months - 2 years' }).click()
  await page.getByRole('button', { name: 'Gym' }).click()
  await page.getByRole('button', { name: 'No', exact: true }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByRole('button', { name: 'Finish' }).click()
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  expect(errors).toEqual([])

  const saved = await page.evaluate(() => window.__TEST_LAST_SAVE__)
  expect(saved.goalPriority).toEqual(['endurance', 'strength'])
})

test('the duplicate goal question is gone - Primary goal is the only goal question shown', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: { goals: [], goal_note: null, height_cm: null, onboarding_completed_at: null },
      templates: [], bodyMetrics: [], exerciseTargets: {},
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=A few basics', { timeout: 10000 })
  await page.locator('input[type="date"]').fill('1995-06-15')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.locator('input[placeholder="e.g. 175"]').fill('178')
  await page.locator('input[placeholder="weight"]').fill('75')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.locator('text=What are you working toward?')).toBeVisible()
  await expect(page.locator('text=What are you training for?')).not.toBeVisible()
  // Only one 'Build muscle' chip should exist now, not two
  await expect(page.getByRole('button', { name: 'Build muscle' })).toHaveCount(1)
})

test('a user who has already completed onboarding skips straight to the main app', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: { goals: ['strength'], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z' },
      templates: [], bodyMetrics: [], exerciseTargets: {},
    }
  })
  await page.goto('/test-harness.html')

  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await expect(page.locator('text=A few basics')).not.toBeVisible()
  expect(errors).toEqual([])
})
