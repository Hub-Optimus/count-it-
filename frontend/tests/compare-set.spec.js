import { test, expect } from '@playwright/test'

test('compareSet: holding, regressed, and warmup exclusion', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_PROPS__ = {
      workouts: [
        {
          id: 'past-1', date: '2026-07-27', notes: null,
          exercises: [{ name: 'Pec Deck', notes: null, sets: [
            { weight: 100, unit: 'lbs', reps: 15, per_side: false, side: null, feel: 'easy' },
          ] }],
        },
      ],
      exerciseNames: ['Pec Deck'],
      defaultUnit: 'kg',
    }
  })
  await page.goto('/test-harness-editor.html')
  await page.waitForSelector('.exercise-block')

  const block = page.locator('.exercise-block').first()
  await block.locator('.exercise-head .name-input').fill('Pec Deck')
  await page.waitForTimeout(150)

  const setRow = block.locator('.set-row').first()
  await setRow.locator('input').nth(0).fill('100')
  await setRow.locator('input').nth(1).fill('15')
  await page.waitForTimeout(150)

  await expect(block.locator('.set-compare').first()).toHaveClass(/set-compare-holding/)

  await block.getByRole('button', { name: 'Warm-up set?', exact: true }).first().click()
  await page.waitForTimeout(150)
  expect(await block.locator('.set-compare').count()).toBe(0)
  await block.getByRole('button', { name: '✓ Warm-up set', exact: true }).first().click()
  await page.waitForTimeout(150)

  await setRow.locator('input').nth(0).fill('90')
  await page.waitForTimeout(150)
  await expect(block.locator('.set-compare').first()).toHaveClass(/set-compare-regressed/)
})
