import { test, expect } from '@playwright/test'

test('stopwatch counts up in real time, use-as-reps fills the field and stays editable', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_PROPS__ = { workouts: [], exerciseNames: [], defaultUnit: 'kg' }
  })
  await page.goto('/test-harness-editor.html')
  await page.waitForSelector('.exercise-block')

  const block = page.locator('.exercise-block').first()
  await block.locator('.exercise-head .name-input').fill('Plank')
  await page.waitForTimeout(150)

  await block.getByRole('button', { name: 'Timer', exact: true }).click()
  await page.waitForTimeout(150)
  await expect(page.locator('.timer-display')).toHaveText('0:00')

  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.waitForTimeout(3300)
  await expect(page.locator('.timer-display')).toHaveText('0:03')

  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('button', { name: 'Use 3s as reps', exact: true }).click()
  await page.waitForTimeout(150)

  const repsInput = block.locator('.set-row').first().locator('input').nth(1)
  await expect(repsInput).toHaveValue('3')
  await expect(block.locator('.reps-unit-suffix')).toHaveText('sec')
  await expect(block.locator('.timed-reps-hint')).toHaveText('from timer')

  await repsInput.fill('50')
  await expect(repsInput).toHaveValue('50')
  await expect(block.locator('.timed-reps-hint')).toHaveCount(0)
})
