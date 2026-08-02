import { test, expect } from '@playwright/test'

async function openBlankEditor(page) {
  await page.addInitScript(() => {
    window.__TEST_PROPS__ = {
      workouts: [
        {
          id: 'past-1',
          date: '2026-07-20',
          notes: null,
          exercises: [
            {
              name: 'Dumbbell Bicep Curl',
              notes: null,
              sets: [
                { weight: 7.5, unit: 'kg', reps: 20, per_side: false, side: null, feel: null },
                { weight: 10, unit: 'kg', reps: 15, per_side: false, side: null, feel: null },
                { weight: 12.5, unit: 'kg', reps: 13, per_side: false, side: null, feel: null },
              ],
            },
          ],
        },
      ],
      exerciseNames: ['Dumbbell Bicep Curl'],
      defaultUnit: 'kg',
    }
  })
  await page.goto('/test-harness-editor.html')
  await page.waitForSelector('.exercise-block')
}

test('Track Sides: enable seeds R first, tap flips L<->R, disable clears, re-enable does not re-explain', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('dialog', (d) => d.accept())

  await openBlankEditor(page)
  const block = page.locator('.exercise-block').first()
  await block.locator('.exercise-head .name-input').fill('Dumbbell Bicep Curl')
  await page.waitForTimeout(150)

  // Start from a realistic 3-set session before enabling side tracking
  await block.getByRole('button', { name: '+ Set', exact: true }).click()
  await block.getByRole('button', { name: '+ Set', exact: true }).click()
  await page.waitForTimeout(100)

  expect(await block.locator('button:has-text("+ Side")').count()).toBe(0)
  expect(await block.locator('text=Stop tracking').count()).toBe(0)

  await block.getByRole('button', { name: 'Track left/right', exact: true }).click()
  await page.waitForTimeout(150)

  const sides = await block.locator('.side-btn').allInnerTexts()
  expect(sides.map((s) => s.trim())).toEqual(['R', 'L', 'R'])

  const firstSideBtn = block.locator('.side-btn').first()
  await firstSideBtn.click()
  await expect(firstSideBtn).toHaveText('L')
  await firstSideBtn.click()
  await expect(firstSideBtn).toHaveText('R')

  await block.getByRole('button', { name: '✓ Tracking left/right', exact: true }).click()
  expect(await block.locator('.side-btn').count()).toBe(0)
  await expect(block.getByRole('button', { name: 'Track left/right', exact: true })).toBeVisible()

  let dialogFired = false
  page.once('dialog', (d) => { dialogFired = true; d.accept() })
  await block.getByRole('button', { name: 'Track left/right', exact: true }).click()
  await page.waitForTimeout(150)
  expect(dialogFired).toBe(false)

  expect(errors).toEqual([])
})
