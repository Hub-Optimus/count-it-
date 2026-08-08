import { api } from './api'
import { testMock } from './testMock'

// Fetch every workout for the signed-in user, newest first, with nested
// exercises and sets. Sorting/shaping now happens on the backend.
export async function fetchWorkouts() {
  const mock = testMock()
  if (mock) return mock.workouts ?? []
  return api.get('/api/workouts')
}

export async function insertFullWorkout(userId, { date, split, notes, exercises, startedAt, finishedAt }) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_SAVE__ = { date, split, notes, exercises, startedAt, finishedAt }
    return 'test-workout-id'
  }
  const { id } = await api.post('/api/workouts', { date, split, notes, exercises, startedAt, finishedAt })
  return id
}

export async function updateFullWorkout(userId, workoutId, { date, split, notes, exercises, startedAt, finishedAt }) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_SAVE__ = { date, split, notes, exercises, startedAt, finishedAt }
    return
  }
  await api.put(`/api/workouts/${workoutId}`, { date, split, notes, exercises, startedAt, finishedAt })
}

export async function deleteWorkout(workoutId) {
  await api.del(`/api/workouts/${workoutId}`)
}

// Combine two same-day workouts into one. Composes the already-tested
// update/delete functions rather than new low-level calls, to keep this
// destructive operation as low-risk as possible. Exercises from both are
// kept as separate entries (no attempt to merge same-named exercises'
// sets together) - safer and unambiguous, if slightly less tidy.
export async function mergeWorkouts(userId, keepWorkout, mergeFromWorkout) {
  const toPlainExercises = (w) =>
    w.exercises.map((ex) => ({
      name: ex.name,
      notes: ex.notes,
      // superset deliberately dropped here - two independent workouts'
      // group keys could collide and incorrectly link unrelated
      // exercises together, which is worse than just losing the link
      sets: ex.sets.map((s) => ({
        weight: s.weight, unit: s.unit, reps: s.reps, perSide: s.per_side, side: s.side, feel: s.feel,
        warmup: s.warmup,
      })),
    }))
  const combinedExercises = [...toPlainExercises(keepWorkout), ...toPlainExercises(mergeFromWorkout)]
  const combinedNotes = [keepWorkout.notes, mergeFromWorkout.notes].filter(Boolean).join(' | ') || null
  await updateFullWorkout(userId, keepWorkout.id, {
    startedAt: keepWorkout.started_at || mergeFromWorkout.started_at || null,
    finishedAt: keepWorkout.finished_at || mergeFromWorkout.finished_at || null,
    date: keepWorkout.date,
    split: keepWorkout.split || mergeFromWorkout.split || null,
    notes: combinedNotes,
    exercises: combinedExercises,
  })
  await deleteWorkout(mergeFromWorkout.id)
}

// ---- profiles (F1: goals) ----

export async function fetchProfile(userId) {
  const mock = testMock()
  if (mock) return mock.profile ?? { goals: [], goal_note: null, height_cm: null, onboarding_completed_at: '2026-01-01T00:00:00.000Z' }
  return api.get('/api/profile')
}

export async function saveProfile(userId, { goals, goalNote }) {
  await api.put('/api/profile/goals', { goals, goalNote })
}

export async function saveHeight(userId, heightCm) {
  await api.put('/api/profile/height', { heightCm })
}

// ---- onboarding (F2: body basics, goal-driving fields, preferences) ----

export async function saveOnboarding(userId, {
  dateOfBirth, sex, heightCm, weight, weightUnit,
  goals, goalNote,
  goalPriority, targetWeight, targetWeightUnit, activityLevel, experienceLevel, trainLocations, hasTrainer,
  injuryNotes, workoutDaysPerWeek, remindersEnabled, restDayNudgesEnabled, dietaryPrefs,
}) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_SAVE__ = { dateOfBirth, sex, heightCm, weight, weightUnit, goalPriority, hasTrainer }
    return
  }
  await api.post('/api/onboarding', {
    dateOfBirth, sex, heightCm, weight, weightUnit,
    goals, goalNote,
    goalPriority, targetWeight, targetWeightUnit, activityLevel, experienceLevel, trainLocations, hasTrainer,
    injuryNotes, workoutDaysPerWeek, remindersEnabled, restDayNudgesEnabled, dietaryPrefs,
  })
  // Backend handles the same-day body_metrics row and beginner roadmap
  // init as one atomic step server-side (mirrors what this function used
  // to do with two extra calls).
}

// ---- beginner roadmap ----

export async function initRoadmapProgress(userId) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_ROADMAP_INIT__ = { userId }
    return
  }
  await api.post('/api/roadmap/init')
}

export async function fetchRoadmapProgress(userId) {
  const mock = testMock()
  if (mock) return mock.roadmapProgress ?? null
  return api.get('/api/roadmap')
}

// Called from the roadmap screen whenever computed progress says the
// user has actually earned the next stage. Only ever moves forward -
// the screen itself decides when to call this, this just persists it.
export async function advanceRoadmapStage(userId, stage) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_ROADMAP_STAGE__ = stage
    return
  }
  await api.put('/api/roadmap/stage', { stage })
}

export async function markRoadmapGraduated(userId) {
  const mock = testMock()
  if (mock) {
    window.__TEST_ROADMAP_GRADUATED__ = true
    return
  }
  await api.post('/api/roadmap/graduate')
}

// TEST-ONLY. Directly overwrites roadmap_progress fields so a QA account
// can jump to any stage, simulate graduation, or reset - without waiting
// on real logged days or the real 8-week floor. Only ever called from
// the debug panel in Roadmap.jsx, which is itself gated to one specific
// account email. Never reachable from normal app flow.
export async function debugSetRoadmapProgress(userId, { stage, startedAt, graduatedAt }) {
  const mock = testMock()
  if (mock) {
    window.__TEST_DEBUG_ROADMAP_SET__ = { stage, startedAt, graduatedAt }
    return { stage, started_at: startedAt, graduated_at: graduatedAt }
  }
  return api.put('/api/roadmap/debug', { stage, startedAt, graduatedAt })
}

// ---- body weight log ----

export async function fetchBodyMetrics(userId) {
  const mock = testMock()
  if (mock) return mock.bodyMetrics ?? []
  return api.get('/api/body-metrics')
}

export async function insertBodyMetric(userId, { date, weight, weightUnit }) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_BODY_METRIC__ = { date, weight, weightUnit }
    return
  }
  await api.post('/api/body-metrics', { date, weight, weightUnit })
}

export async function deleteBodyMetric(id) {
  await api.del(`/api/body-metrics/${id}`)
}

// ---- per-exercise rep targets (progressive overload) ----

export async function fetchExerciseTargets(userId) {
  const mock = testMock()
  if (mock) return mock.exerciseTargets ?? {}
  return api.get('/api/exercise-targets')
}

export async function saveExerciseTarget(userId, exerciseName, targetReps, seedWeight = null, seedWeightUnit = null) {
  await api.put('/api/exercise-targets', { exerciseName, targetReps, seedWeight, seedWeightUnit })
}

export async function setTrackSides(userId, exerciseName, trackSides) {
  await api.put('/api/exercise-targets/track-sides', { exerciseName, trackSides })
}

export async function setPerSide(userId, exerciseName, perSide) {
  await api.put('/api/exercise-targets/per-side', { exerciseName, perSide })
}

// ---- templates (named, reusable exercise lists - no locked-in numbers) ----

export async function fetchTemplates(userId) {
  const mock = testMock()
  if (mock) return mock.templates ?? []
  const templates = await api.get('/api/templates')
  return templates ?? []
}

export async function saveTemplate(userId, name, exerciseNames) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_SAVE__ = { name, exerciseNames }
    return
  }
  await api.post('/api/templates', { name, exerciseNames })
}

export async function deleteTemplate(id) {
  await api.del(`/api/templates/${id}`)
}

// ---- learning videos (beginner roadmap) ----

export async function fetchVideos() {
  const mock = testMock()
  if (mock) return mock.videos ?? []
  return api.get('/api/videos')
}

export async function createVideo({ title, description, storagePath, stage }) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_SAVE__ = { title, description, storagePath, stage }
    return
  }
  await api.post('/api/videos', { title, description, storagePath, stage })
}

export async function deleteVideo(id) {
  await api.del(`/api/videos/${id}`)
}