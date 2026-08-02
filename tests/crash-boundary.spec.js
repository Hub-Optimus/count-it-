import { test, expect } from '@playwright/test'

test('error boundary shows a real fallback on a crash, not a blank page', async ({ page }) => {
  await page.goto('/test-harness-crash.html')
  await page.waitForTimeout(300)

  await expect(page.locator('text=Something went wrong.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible()

  const rootHtml = await page.evaluate(() => document.getElementById('root').innerHTML)
  expect(rootHtml).not.toBe('')
})
