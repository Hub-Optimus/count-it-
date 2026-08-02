import { test, expect } from '@playwright/test'

async function openBlankEditor(page) {
  await page.addInitScript(() => {
    window.__TEST_PROPS__ = { workouts: [], exerciseNames: [], defaultUnit: 'kg' }
  })
  await page.goto('/test-harness-editor.html')
  await page.waitForSelector('.exercise-block')
}

test('linking two exercises shows A1/A2 badges, unlinking removes both, unrelated exercise stays unlinked', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await openBlankEditor(page)

  const first = page.locator('.exercise-block').nth(0)
  await first.locator('.exercise-head .name-input').fill('Bench Press')

  await page.getByRole('button', { name: '+ Exercise', exact: true }).click()
  const second = page.locator('.exercise-block').nth(1)
  await second.locator('.exercise-head .name-input').fill('Tricep Pushdown')
  await page.waitForTimeout(100)

  await second.getByRole('button', { name: /Link as superset with/ }).click()
  await page.waitForTimeout(150)

  expect(await page.locator('.superset-badge').allInnerTexts()).toEqual(['A1', 'A2'])

  await page.getByRole('button', { name: '+ Exercise', exact: true }).click()
  const third = page.locator('.exercise-block').nth(2)
  await third.locator('.exercise-head .name-input').fill('Squat')
  await page.waitForTimeout(100)
  expect(await third.locator('.superset-badge').count()).toBe(0)

  await second.getByRole('button', { name: 'Unlink from superset', exact: true }).click()
  await page.waitForTimeout(150)
  expect(await page.locator('.superset-badge').count()).toBe(0)

  expect(errors).toEqual([])
})

test('deleting a linked exercise auto-cleans its partner badge with zero special-case code', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('dialog', (d) => d.accept())

  await openBlankEditor(page)

  const first = page.locator('.exercise-block').nth(0)
  await first.locator('.exercise-head .name-input').fill('Bench Press')

  await page.getByRole('button', { name: '+ Exercise', exact: true }).click()
  const second = page.locator('.exercise-block').nth(1)
  await second.locator('.exercise-head .name-input').fill('Overhead Press')
  await page.waitForTimeout(100)
  await second.getByRole('button', { name: /Link as superset with/ }).click()
  await page.waitForTimeout(150)

  expect(await page.locator('.superset-badge').count()).toBe(2)

  await first.locator('button[aria-label="Remove exercise"]').click()
  await page.waitForTimeout(150)

  expect(await page.locator('.exercise-block').count()).toBe(1)
  expect(await page.locator('.superset-badge').count()).toBe(0)
  expect(errors).toEqual([])
})
