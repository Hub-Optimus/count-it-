import { test, expect } from '@playwright/test'

test('weight and reps reject non-numeric input, warning fires without needing reps touched', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_PROPS__ = {
      workouts: [
        {
          id: 'past-1', date: '2026-07-20', notes: null,
          exercises: [{ name: 'Bench Press', notes: null, sets: [
            { weight: 20, unit: 'kg', reps: 10, per_side: false, side: null, feel: null },
          ] }],
        },
      ],
      exerciseNames: ['Bench Press'],
      defaultUnit: 'kg',
    }
  })
  await page.goto('/test-harness-editor.html')
  await page.waitForSelector('.exercise-block')

  const block = page.locator('.exercise-block').first()
  await block.locator('.exercise-head .name-input').fill('Bench Press')
  await page.waitForTimeout(150)

  const setRow = block.locator('.set-row').first()
  const weightInput = setRow.locator('input').nth(0)
  const repsInput = setRow.locator('input').nth(1)

  await weightInput.fill('fjwklfjkw')
  await expect(weightInput).toHaveValue('')

  await repsInput.fill('csd')
  await expect(repsInput).toHaveValue('')

  await weightInput.fill('12.5.7abc99')
  await expect(weightInput).toHaveValue('12.5799')

  await weightInput.fill('234234')
  await page.waitForTimeout(150)
  await expect(block.locator('.weight-warning')).toBeVisible()

  expect(errors).toEqual([])
})

test('bodyweight chip: mismatched (strikethrough) when something else is filled, active when matching', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_PROPS__ = {
      workouts: [
        {
          id: 'past-1', date: '2026-07-20', notes: null,
          exercises: [{ name: 'Pull-up', notes: null, sets: [
            { weight: 100, unit: 'lbs', reps: 10, per_side: false, side: null, feel: null },
          ] }],
        },
      ],
      exerciseNames: ['Pull-up'],
      defaultUnit: 'kg',
      latestBodyweight: { weight: 58, unit: 'kg' },
    }
  })
  await page.goto('/test-harness-editor.html')
  await page.waitForSelector('.exercise-block')

  const block = page.locator('.exercise-block').first()
  await block.locator('.exercise-head .name-input').fill('Pull-up')
  await page.waitForTimeout(150)

  const bwChip = block.getByRole('button', { name: 'Bodyweight' })
  await expect(bwChip).toHaveClass(/chip-not-applied/)

  await bwChip.click()
  await page.waitForTimeout(150)
  await expect(bwChip).toHaveClass(/\bon\b/)
  await expect(bwChip).not.toHaveClass(/chip-not-applied/)
})
