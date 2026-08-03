import { supabase } from './supabase'
import { testMock } from './testMock'
import { todayISO } from './format'

// Fetch every workout for the signed-in user, newest first,
// with nested exercises and sets (sorted client-side by position).
export async function fetchWorkouts() {
  const mock = testMock()
  if (mock) return mock.workouts ?? []
  const { data, error } = await supabase
    .from('workouts')
    .select('id, date, split, notes, started_at, finished_at, exercises(id, name, notes, position, superset_group, sets(id, weight, unit, reps, per_side, side, feel, warmup, position))')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  const byPos = (a, b) => a.position - b.position
  return (data ?? []).map((w) => ({
    ...w,
    exercises: [...(w.exercises ?? [])].sort(byPos).map((ex) => ({
      ...ex,
      sets: [...(ex.sets ?? [])].sort(byPos),
    })),
  }))
}

// exercises: [{ name, notes, sets: [{ weight, unit, reps, feel, perSide, side }] }]
export async function insertChildren(userId, workoutId, exercises) {
  const { data: exRows, error: exErr } = await supabase
    .from('exercises')
    .insert(exercises.map((ex, i) => ({ workout_id: workoutId, user_id: userId, name: ex.name, notes: ex.notes || null, superset_group: ex.superset || null, position: i })))
    .select('id, position')
  if (exErr) throw exErr

  const idByPos = Object.fromEntries(exRows.map((r) => [r.position, r.id]))
  const rows = exercises.flatMap((ex, i) =>
    ex.sets.map((set, j) => ({
      exercise_id: idByPos[i],
      user_id: userId,
      weight: set.weight ?? null,
      unit: set.unit || 'kg',
      reps: set.reps ?? null,
      per_side: Boolean(set.perSide),
      side: set.side || null,
      feel: set.feel || null,
      warmup: Boolean(set.warmup),
      position: j,
    }))
  )
  if (rows.length) {
    const { error } = await supabase.from('sets').insert(rows)
    if (error) throw error
  }
}

export async function insertFullWorkout(userId, { date, split, notes, exercises, startedAt, finishedAt }) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_SAVE__ = { date, split, notes, exercises, startedAt, finishedAt }
    return 'test-workout-id'
  }
  const { data, error } = await supabase
    .from('workouts')
    .insert({ user_id: userId, date, split, notes: notes || null, started_at: startedAt || null, finished_at: finishedAt || null })
    .select('id')
    .single()
  if (error) throw error
  await insertChildren(userId, data.id, exercises)
  return data.id
}

export async function updateFullWorkout(userId, workoutId, { date, split, notes, exercises, startedAt, finishedAt }) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_SAVE__ = { date, split, notes, exercises, startedAt, finishedAt }
    return
  }
  const { error } = await supabase
    .from('workouts')
    .update({ date, split, notes: notes || null, started_at: startedAt || null, finished_at: finishedAt || null })
    .eq('id', workoutId)
  if (error) throw error
  // Replace children wholesale (sets cascade-delete with their exercises)
  const { error: delErr } = await supabase.from('exercises').delete().eq('workout_id', workoutId)
  if (delErr) throw delErr
  await insertChildren(userId, workoutId, exercises)
}

export async function deleteWorkout(workoutId) {
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId)
  if (error) throw error
}

// Combine two same-day workouts into one. Composes the already-tested
// update/delete functions rather than new low-level SQL, to keep this
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
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      goals, goal_note, height_cm,
      date_of_birth, sex,
      goal_priority, target_weight, target_weight_unit, activity_level, experience_level, train_locations, has_trainer,
      injury_notes, workout_days_per_week, reminders_enabled, rest_day_nudges_enabled, dietary_prefs,
      onboarding_completed_at
    `)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data // null when the user has no profile row yet
}

export async function saveProfile(userId, { goals, goalNote }) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, goals, goal_note: goalNote || null, updated_at: new Date().toISOString() })
  if (error) throw error
}

// Partial upsert - only touches height_cm, leaves goals/goal_note untouched
// (Postgres upsert only SETs columns present in the payload).
export async function saveHeight(userId, heightCm) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, height_cm: heightCm, updated_at: new Date().toISOString() })
  if (error) throw error
}

// ---- onboarding (F2: body basics, goal-driving fields, preferences) ----

// One upsert for everything collected across the 3-step onboarding wizard,
// plus a same-day body_metrics row for the starting weight (reuses the
// existing weight-log table instead of a separate static field, so the
// user's weight history starts from day one instead of day two).
// onboarding_completed_at is what the app's onboarding gate actually
// checks - stamping it here is what lets the user past the wall.
export async function saveOnboarding(userId, {
  dateOfBirth, sex, heightCm, weight, weightUnit,
  goals, goalNote,
  goalPriority, targetWeight, targetWeightUnit, activityLevel, experienceLevel, trainLocations, hasTrainer,
  injuryNotes, workoutDaysPerWeek, remindersEnabled, restDayNudgesEnabled, dietaryPrefs,
}) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_SAVE__ = { dateOfBirth, sex, heightCm, weight, weightUnit, goalPriority, hasTrainer }
  } else {
    const { error } = await supabase.from('profiles').upsert({
      user_id: userId,
      date_of_birth: dateOfBirth || null,
      sex: sex || null,
      height_cm: heightCm ?? null,
      goals: goals || [],
      goal_note: goalNote || null,
      goal_priority: goalPriority || [],
      target_weight: targetWeight ?? null,
      target_weight_unit: targetWeightUnit || null,
      activity_level: activityLevel || null,
      experience_level: experienceLevel || null,
      train_locations: trainLocations || [],
      has_trainer: hasTrainer ?? null,
      injury_notes: injuryNotes || null,
      workout_days_per_week: workoutDaysPerWeek ?? null,
      reminders_enabled: remindersEnabled ?? true,
      rest_day_nudges_enabled: restDayNudgesEnabled ?? false,
      dietary_prefs: dietaryPrefs || [],
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
  }
  // Runs in both mock and real mode - insertBodyMetric and
  // initRoadmapProgress each handle their own mock branch, so this
  // stays one single code path either way instead of two that can
  // silently drift apart.
  if (weight) {
    await insertBodyMetric(userId, { date: todayISO(), weight, weightUnit: weightUnit || 'kg' })
  }
  // Only beginners get a roadmap right now - Intermediate/Advanced
  // roadmaps are a later phase. Re-running onboarding (e.g. editing
  // answers) won't create a second row - initRoadmapProgress no-ops if
  // one already exists.
  if (experienceLevel === 'beginner') {
    await initRoadmapProgress(userId)
  }
}

// ---- beginner roadmap ----

export async function initRoadmapProgress(userId) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_ROADMAP_INIT__ = { userId }
    return
  }
  const { error } = await supabase
    .from('roadmap_progress')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (error) throw error
}

export async function fetchRoadmapProgress(userId) {
  const mock = testMock()
  if (mock) return mock.roadmapProgress ?? null
  const { data, error } = await supabase
    .from('roadmap_progress')
    .select('stage, started_at, graduated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

// ---- body weight log ----

export async function fetchBodyMetrics(userId) {
  const mock = testMock()
  if (mock) return mock.bodyMetrics ?? []
  const { data, error } = await supabase
    .from('body_metrics')
    .select('id, date, weight, weight_unit')
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function insertBodyMetric(userId, { date, weight, weightUnit }) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_BODY_METRIC__ = { date, weight, weightUnit }
    return
  }
  const { error } = await supabase
    .from('body_metrics')
    .insert({ user_id: userId, date, weight, weight_unit: weightUnit })
  if (error) throw error
}

export async function deleteBodyMetric(id) {
  const { error } = await supabase.from('body_metrics').delete().eq('id', id)
  if (error) throw error
}

// ---- per-exercise rep targets (progressive overload) ----

export async function fetchExerciseTargets(userId) {
  const mock = testMock()
  if (mock) return mock.exerciseTargets ?? {}
  const { data, error } = await supabase
    .from('exercise_targets')
    .select('exercise_name, target_reps, seed_weight, seed_weight_unit, track_sides, per_side')
  if (error) throw error
  const map = {}
  for (const row of data ?? []) {
    map[row.exercise_name.toLowerCase()] = {
      reps: row.target_reps,
      seedWeight: row.seed_weight,
      seedWeightUnit: row.seed_weight_unit,
      trackSides: Boolean(row.track_sides),
      perSide: Boolean(row.per_side),
    }
  }
  return map
}

export async function saveExerciseTarget(userId, exerciseName, targetReps, seedWeight = null, seedWeightUnit = null) {
  const { error } = await supabase
    .from('exercise_targets')
    .upsert({
      user_id: userId, exercise_name: exerciseName, target_reps: targetReps,
      seed_weight: seedWeight, seed_weight_unit: seedWeightUnit, updated_at: new Date().toISOString(),
    })
  if (error) throw error
}

// Partial upsert - only touches track_sides, leaves any existing rep
// target/seed weight on this exercise untouched (same safe pattern as
// saveHeight: Postgres upsert only SETs columns present in the payload).
export async function setTrackSides(userId, exerciseName, trackSides) {
  const { error } = await supabase
    .from('exercise_targets')
    .upsert({ user_id: userId, exercise_name: exerciseName, track_sides: trackSides, updated_at: new Date().toISOString() })
  if (error) throw error
}

// Same partial-upsert pattern as setTrackSides - only touches per_side.
export async function setPerSide(userId, exerciseName, perSide) {
  const { error } = await supabase
    .from('exercise_targets')
    .upsert({ user_id: userId, exercise_name: exerciseName, per_side: perSide, updated_at: new Date().toISOString() })
  if (error) throw error
}

// ---- templates (named, reusable exercise lists - no locked-in numbers) ----

export async function fetchTemplates(userId) {
  const mock = testMock()
  if (mock) return mock.templates ?? []
  const { data, error } = await supabase
    .from('templates')
    .select('id, name, exercise_names, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((t) => ({ id: t.id, name: t.name, exerciseNames: t.exercise_names }))
}

export async function saveTemplate(userId, name, exerciseNames) {
  const mock = testMock()
  if (mock) {
    window.__TEST_LAST_SAVE__ = { name, exerciseNames }
    return
  }
  const { error } = await supabase
    .from('templates')
    .insert({ user_id: userId, name, exercise_names: exerciseNames })
  if (error) throw error
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from('templates').delete().eq('id', id)
  if (error) throw error
}
