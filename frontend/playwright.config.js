import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // shared dev server, keep it simple and predictable
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5183',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 900 } } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5183 --strictPort',
    url: 'http://localhost:5183',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
