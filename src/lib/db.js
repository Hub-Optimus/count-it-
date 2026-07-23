import { supabase } from './supabase'

// Fetch every workout for the signed-in user, newest first,
// with nested exercises and sets (sorted client-side by position).
export async function fetchWorkouts() {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, date, split, notes, exercises(id, name, position, sets(id, weight, unit, reps, per_side, feel, position))')
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

// exercises: [{ name, sets: [{ weight, unit, reps, feel, perSide }] }]
export async function insertChildren(userId, workoutId, exercises) {
  const { data: exRows, error: exErr } = await supabase
    .from('exercises')
    .insert(exercises.map((ex, i) => ({ workout_id: workoutId, user_id: userId, name: ex.name, position: i })))
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
      feel: set.feel || null,
      position: j,
    }))
  )
  if (rows.length) {
    const { error } = await supabase.from('sets').insert(rows)
    if (error) throw error
  }
}

export async function insertFullWorkout(userId, { date, split, notes, exercises }) {
  const { data, error } = await supabase
    .from('workouts')
    .insert({ user_id: userId, date, split, notes: notes || null })
    .select('id')
    .single()
  if (error) throw error
  await insertChildren(userId, data.id, exercises)
  return data.id
}

export async function updateFullWorkout(userId, workoutId, { date, split, notes, exercises }) {
  const { error } = await supabase
    .from('workouts')
    .update({ date, split, notes: notes || null })
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

// ---- profiles (F1: goals) ----

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('goals, goal_note, height_cm')
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

// ---- body weight log ----

export async function fetchBodyMetrics(userId) {
  const { data, error } = await supabase
    .from('body_metrics')
    .select('id, date, weight, weight_unit')
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function insertBodyMetric(userId, { date, weight, weightUnit }) {
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
  const { data, error } = await supabase
    .from('exercise_targets')
    .select('exercise_name, target_reps')
  if (error) throw error
  const map = {}
  for (const row of data ?? []) map[row.exercise_name.toLowerCase()] = row.target_reps
  return map
}

export async function saveExerciseTarget(userId, exerciseName, targetReps) {
  const { error } = await supabase
    .from('exercise_targets')
    .upsert({ user_id: userId, exercise_name: exerciseName, target_reps: targetReps, updated_at: new Date().toISOString() })
  if (error) throw error
}
