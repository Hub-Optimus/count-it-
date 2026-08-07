import { test, expect } from '@playwright/test'

test('template picker pre-fills the right exercises', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: { goals: ['strength'], goal_note: null, height_cm: null },
      templates: [
        { id: 't1', name: 'Push Day A', exerciseNames: ['Bench Press', 'Overhead Press', 'Tricep Pushdown'] },
      ],
      bodyMetrics: [],
      exerciseTargets: {},
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.waitForTimeout(300)

  await page.locator('.fab').click()
  await page.waitForTimeout(300)

  await expect(page.locator('.template-picker')).toBeVisible()
  const rows = page.locator('.template-picker-row')
  expect(await rows.allInnerTexts()).toEqual(['Push Day A\n3 exercises'])

  await rows.first().click()
  await page.waitForTimeout(300)

  const nameInputs = page.locator('.exercise-head .name-input')
  expect(await nameInputs.count()).toBe(3)
  expect(await nameInputs.nth(0).inputValue()).toBe('Bench Press')
  expect(await nameInputs.nth(1).inputValue()).toBe('Overhead Press')
  expect(await nameInputs.nth(2).inputValue()).toBe('Tricep Pushdown')

  expect(errors).toEqual([])
})
