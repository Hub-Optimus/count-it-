import { test, expect } from '@playwright/test'

test('a beginner with a roadmap sees the Roadmap tab, showing their current stage', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner', goal_priority: ['strength'],
      },
      roadmapProgress: { stage: 1, started_at: new Date().toISOString(), graduated_at: null, stage2_milestones_seen: [] },
      templates: [], bodyMetrics: [], exerciseTargets: {}, videos: [],
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })

  await expect(page.getByRole('button', { name: 'Roadmap' })).toBeVisible()
  await page.getByRole('button', { name: 'Roadmap' }).click()

  await expect(page.locator('text=Stage 1 of 3')).toBeVisible()
  await expect(page.locator('text=Learn the Lifts').first()).toBeVisible()
  await expect(page.locator('text=0 of 3 days logged')).toBeVisible()
  // strength goal -> 5x5, not the general-fitness default
  await expect(page.locator('.quick-log-name', { hasText: 'Dumbbell Squat' })).toBeVisible()
  await expect(page.locator('text=5 reps × 5 sets').first()).toBeVisible()
  // Video "how to" link present per exercise (curated for the fixed 5)
  await expect(page.getByRole('button', { name: '▶ How to do this' }).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('quick-log: logging one exercise via its Done toggle and finishing saves a partial workout', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner', goal_priority: ['lose_fat'],
      },
      roadmapProgress: { stage: 1, started_at: new Date().toISOString(), graduated_at: null, stage2_milestones_seen: [] },
      templates: [], bodyMetrics: [], exerciseTargets: {}, videos: [],
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.getByRole('button', { name: 'Roadmap' }).click()

  // All 5 exercises are visible together now - no stepping required to see the rest
  await expect(page.locator('.quick-log-name', { hasText: 'Dumbbell Squat' })).toBeVisible()
  await expect(page.locator('.quick-log-name', { hasText: 'Dead Bug' })).toBeVisible()

  await page.getByLabel('Dumbbell Squat weight').fill('20')
  await page.getByLabel('Mark Dumbbell Squat done').click()

  await expect(page.locator('text=1 of 5 logged')).toBeVisible()

  // Partial sessions are still allowed - Finish enables with just 1 done
  const finishBtn = page.getByRole('button', { name: 'Finish session (1)' })
  await expect(finishBtn).toBeEnabled()
  await finishBtn.click()

  const saved = await page.evaluate(() => window.__TEST_LAST_SAVE__)
  expect(saved.exercises).toHaveLength(1)
  expect(saved.exercises[0].name).toBe('Dumbbell Squat')
  expect(saved.exercises[0].sets[0].weight).toBe(20)
  expect(saved.exercises[0].sets[0].reps).toBe(13) // lose_fat default reps, never typed - proves the pre-fill actually worked
  expect(errors).toEqual([])
})

test('quick-log requires a real weight before an exercise can be marked done', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner', goal_priority: ['strength'],
      },
      roadmapProgress: { stage: 1, started_at: new Date().toISOString(), graduated_at: null, stage2_milestones_seen: [] },
      templates: [], bodyMetrics: [], exerciseTargets: {}, videos: [],
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.getByRole('button', { name: 'Roadmap' }).click()

  // No weight typed - clicking Done should refuse to mark it done
  await page.getByLabel('Mark Dumbbell Squat done').click()
  await expect(page.locator('text=1 of 5 logged')).toHaveCount(0)

  // Fill a real weight - now it works
  await page.getByLabel('Dumbbell Squat weight').fill('20')
  await page.getByLabel('Mark Dumbbell Squat done').click()
  await expect(page.locator('text=1 of 5 logged')).toBeVisible()
})

test('quick-log: filling and marking all 5 exercises done saves a full workout', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner', goal_priority: ['strength'],
      },
      roadmapProgress: { stage: 1, started_at: new Date().toISOString(), graduated_at: null, stage2_milestones_seen: [] },
      templates: [], bodyMetrics: [], exerciseTargets: {}, videos: [],
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.getByRole('button', { name: 'Roadmap' }).click()

  const names = ['Dumbbell Squat', 'Dumbbell Romanian Deadlift', 'Push-up', 'Dumbbell Bent Over Row', 'Dead Bug']
  for (const name of names) {
    await expect(page.locator('.quick-log-name', { hasText: name })).toBeVisible()
    await page.getByLabel(`${name} weight`).fill('20')
    await page.getByLabel(`Mark ${name} done`).click()
  }

  await expect(page.locator('text=5 of 5 logged')).toBeVisible()
  const finishBtn = page.getByRole('button', { name: 'Finish session (5)' })
  await expect(finishBtn).toBeEnabled()
  await finishBtn.click()

  await expect(page.locator('text=Session logged')).toBeVisible()
  const saved = await page.evaluate(() => window.__TEST_LAST_SAVE__)
  expect(saved.exercises).toHaveLength(5)
  expect(errors).toEqual([])
})

test('video popup opens inline over the page and never navigates away', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner', goal_priority: ['strength'],
      },
      roadmapProgress: { stage: 1, started_at: new Date().toISOString(), graduated_at: null, stage2_milestones_seen: [] },
      templates: [], bodyMetrics: [], exerciseTargets: {}, videos: [],
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.getByRole('button', { name: 'Roadmap' }).click()

  await page.getByRole('button', { name: '▶ How to do this' }).first().click()
  await expect(page.locator('.roadmap-video-modal')).toBeVisible()
  expect(page.url()).toContain('test-harness.html') // still on the same page - no navigation happened

  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.locator('.roadmap-video-modal')).toHaveCount(0)
})

test('can add an extra exercise via the picker beyond the fixed list', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner', goal_priority: ['strength'],
      },
      roadmapProgress: { stage: 1, started_at: new Date().toISOString(), graduated_at: null, stage2_milestones_seen: [] },
      templates: [], bodyMetrics: [], exerciseTargets: {}, videos: [],
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.getByRole('button', { name: 'Roadmap' }).click()

  await page.getByRole('button', { name: '+ Add exercise' }).click()
  await page.getByPlaceholder('Search exercises…').fill('Barbell Squat')
  await page.locator('.picker-row', { hasText: 'Barbell Squat' }).first().click()

  await expect(page.locator('.quick-log-name', { hasText: 'Barbell Squat' })).toBeVisible()
})

test('stage 2 has its own 6-exercise list with progress bar and milestones intact', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner', goal_priority: ['strength'],
      },
      roadmapProgress: { stage: 2, started_at: new Date().toISOString(), graduated_at: null, stage2_milestones_seen: [] },
      templates: [], bodyMetrics: [], exerciseTargets: {}, videos: [],
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.getByRole('button', { name: 'Roadmap' }).click()

  await expect(page.locator('text=Stage 2 of 3')).toBeVisible()
  await expect(page.locator('text=0 of 12 days logged')).toBeVisible()
  await expect(page.locator('.quick-log-name', { hasText: 'Dumbbell Goblet Squat' })).toBeVisible()
  await expect(page.locator('.quick-log-name', { hasText: 'Russian Twist' })).toBeVisible()
  await expect(page.getByRole('button', { name: '+ Add exercise' })).toBeVisible()
  expect(errors).toEqual([])
})

test('stage 2 milestone celebration shows at day 3 and is not shown again once seen', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    const workouts = [1, 2, 3].map((d) => ({
      id: `w${d}`, date: `2026-01-0${d}`, split: null, notes: null,
      exercises: [{
        id: `e${d}`, name: 'Dumbbell Goblet Squat', notes: null, position: 0,
        sets: [{ id: `s${d}`, weight: 20, unit: 'kg', reps: 10, per_side: false, side: null, feel: null, warmup: false, position: 0 }],
      }],
    }))
    window.__TEST_MOCK__ = {
      workouts,
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner',
      },
      roadmapProgress: { stage: 2, started_at: '2026-01-01T00:00:00.000Z', graduated_at: null, stage2_milestones_seen: [] },
      templates: [], bodyMetrics: [], exerciseTargets: {}, videos: [],
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.getByRole('button', { name: 'Roadmap' }).click()

  await expect(page.locator('text=3 days in')).toBeVisible({ timeout: 10000 })
  const seen = await page.evaluate(() => window.__TEST_LAST_MILESTONE_SEEN__)
  expect(seen).toBe(3)
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
      templates: [], bodyMetrics: [], exerciseTargets: {}, videos: [],
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
      roadmapProgress: { stage: 1, started_at: '2026-01-01T00:00:00.000Z', graduated_at: null, stage2_milestones_seen: [] },
      templates: [], bodyMetrics: [], exerciseTargets: {}, videos: [],
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

test('graduated state shows the graduation card and reward badge when earned', async ({ page }) => {
  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner',
      },
      roadmapProgress: {
        stage: 3, started_at: '2020-01-01T00:00:00.000Z', graduated_at: '2026-01-01T00:00:00.000Z',
        reward_amount: 50, reward_status: 'earned', stage2_milestones_seen: [3, 6, 9],
      },
      templates: [], bodyMetrics: [], exerciseTargets: {}, videos: [],
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.getByRole('button', { name: 'Roadmap' }).click()
  await expect(page.locator("text=You've graduated Beginner")).toBeVisible()
  await expect(page.locator('text=You earned ₹50')).toBeVisible()
})

test('debug panel never appears for a normal account', async ({ page }) => {
  await page.addInitScript(() => {
    // Default test-harness email ('test@example.com') - deliberately
    // NOT the debug account, to prove the gate actually excludes everyone else.
    window.__TEST_MOCK__ = {
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner', goal_priority: ['strength'],
      },
      roadmapProgress: { stage: 1, started_at: new Date().toISOString(), graduated_at: null, stage2_milestones_seen: [] },
      templates: [], bodyMetrics: [], exerciseTargets: {}, videos: [],
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.getByRole('button', { name: 'Roadmap' }).click()
  await expect(page.locator('.roadmap-debug-panel')).toHaveCount(0)
})

test('debug panel appears for the test account and can jump stages instantly', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.addInitScript(() => {
    window.__TEST_MOCK__ = {
      userEmail: 'prakashkoulagi.official@gmail.com',
      workouts: [],
      profile: {
        goals: [], goal_note: null, height_cm: 178, onboarding_completed_at: '2026-01-01T00:00:00.000Z',
        experience_level: 'beginner', goal_priority: ['strength'],
      },
      roadmapProgress: { stage: 1, started_at: new Date().toISOString(), graduated_at: null, stage2_milestones_seen: [] },
      templates: [], bodyMetrics: [], exerciseTargets: {}, videos: [],
    }
  })
  await page.goto('/test-harness.html')
  await page.waitForSelector('text=Workouts', { timeout: 10000 })
  await page.getByRole('button', { name: 'Roadmap' }).click()

  await expect(page.locator('.roadmap-debug-panel')).toBeVisible()
  await expect(page.locator('text=Stage 1 of 3')).toBeVisible()

  await page.getByRole('button', { name: 'Jump to Stage 2' }).click()
  await expect(page.locator('text=Stage 2 of 3')).toBeVisible()
  await expect(page.locator('text=Build the Base').first()).toBeVisible()

  await page.getByRole('button', { name: 'Force graduate now' }).click()
  await expect(page.locator("text=You've graduated Beginner")).toBeVisible()
  // Debug panel survives into the graduated view too - still testable from there
  await expect(page.locator('.roadmap-debug-panel')).toBeVisible()

  await page.getByRole('button', { name: 'Reset to Day 1 (undo everything above)' }).click()
  await expect(page.locator('text=Stage 1 of 3')).toBeVisible()
  await expect(page.locator('text=Learn the Lifts').first()).toBeVisible()

  expect(errors).toEqual([])
})