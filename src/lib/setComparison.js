import { toKg } from './format'

// The most recent OTHER workout (by date) that contains this exact
// exercise name, excluding the workout currently being edited (so
// editing an old session doesn't compare it against itself).
export function lastSessionFor(workouts, exerciseName, excludeWorkoutId) {
  const nl = exerciseName.trim().toLowerCase()
  const candidates = workouts
    .filter((w) => w.id !== excludeWorkoutId)
    .filter((w) => w.exercises.some((ex) => ex.name.trim().toLowerCase() === nl))
    .sort((a, b) => b.date.localeCompare(a.date))
  if (!candidates.length) return null
  const w = candidates[0]
  const ex = w.exercises.find((e) => e.name.trim().toLowerCase() === nl)
  return { date: w.date, sets: ex.sets }
}

// The single best set ever logged for this exercise (highest estimated
// 1RM across all history), for showing "Best: 15kg×10" as a permanent
// reference distinct from "last time" (which is now used to pre-fill
// the set rows directly, not shown as separate text).
const e1rmLocal = (weightKg, reps) => {
  const r = Math.min(reps || 0, 12)
  if (!r || !weightKg) return 0
  return weightKg * (1 + r / 30)
}

export function bestSetEver(workouts, exerciseName, excludeWorkoutId) {
  const nl = exerciseName.trim().toLowerCase()
  let best = null
  let bestE1rm = 0
  for (const w of workouts) {
    if (w.id === excludeWorkoutId) continue
    for (const ex of w.exercises) {
      if (ex.name.trim().toLowerCase() !== nl) continue
      for (const s of ex.sets) {
        if (s.weight == null || !s.reps) continue
        const kg = toKg(Number(s.weight), s.unit)
        const est = e1rmLocal(kg, s.reps)
        if (est > bestE1rm) {
          bestE1rm = est
          best = { weight: s.weight, unit: s.unit, reps: s.reps, perSide: s.per_side }
        }
      }
    }
  }
  return best
}

// Average reps per set across all history for this exercise — a "typical"
// reference distinct from the best-ever set, since a low-energy day
// shouldn't be judged against a personal peak.
export function averageRepsEver(workouts, exerciseName, excludeWorkoutId) {
  const nl = exerciseName.trim().toLowerCase()
  let total = 0
  let count = 0
  for (const w of workouts) {
    if (w.id === excludeWorkoutId) continue
    for (const ex of w.exercises) {
      if (ex.name.trim().toLowerCase() !== nl) continue
      for (const s of ex.sets) {
        if (s.weight == null || !s.reps) continue
        total += Number(s.reps)
        count += 1
      }
    }
  }
  if (!count) return null
  return Math.round((total / count) * 10) / 10 // one decimal, e.g. 13.7
}

// Average weight per set across all history for this exercise, in kg -
// a realistic restart point after a break, distinct from the peak
// (Best) or a single potentially-unrepresentative last session.
export function averageWeightEver(workouts, exerciseName, excludeWorkoutId) {
  const nl = exerciseName.trim().toLowerCase()
  let total = 0
  let count = 0
  for (const w of workouts) {
    if (w.id === excludeWorkoutId) continue
    for (const ex of w.exercises) {
      if (ex.name.trim().toLowerCase() !== nl) continue
      for (const s of ex.sets) {
        if (s.weight == null || !s.reps) continue
        total += toKg(Number(s.weight), s.unit)
        count += 1
      }
    }
  }
  if (!count) return null
  return Math.round((total / count) * 10) / 10
}

// Full history of attempts against a target, oldest first — for the
// Progress view's "hit it or not" timeline. Deliberately NOT used in
// the editor; that screen stays focused on logging, not analysis.
export function achievementHistory(workouts, exerciseName, targetReps) {
  if (!targetReps) return []
  const nl = exerciseName.trim().toLowerCase()
  const sessions = workouts
    .filter((w) => w.exercises.some((ex) => ex.name.trim().toLowerCase() === nl))
    .sort((a, b) => a.date.localeCompare(b.date))
  return sessions.map((w) => {
    const ex = w.exercises.find((e) => e.name.trim().toLowerCase() === nl)
    const validSets = ex.sets.filter((s) => s.weight != null && s.reps)
    const achieved = validSets.length > 0 && validSets.every((s) => s.reps >= targetReps)
    return { date: w.date, achieved, sets: validSets }
  })
}

// True if every set in last session hit (or exceeded) the rep target -
// the double-progression signal that it's time to move up in weight,
// shown BEFORE the user re-logs the same numbers, not after.
export function hitTargetLastTime(lastSession, targetReps) {
  if (!lastSession || !targetReps) return false
  const validSets = lastSession.sets.filter((s) => s.weight != null && s.reps)
  if (!validSets.length) return false
  return validSets.every((s) => s.reps >= targetReps)
}

// Compare one current set to the same-position set from last time.
// Returns null if there's nothing to compare against (first time doing
// this exercise, or this set position didn't exist last time).
//
// Status meanings:
//   'progressing' - weight is higher than last time
//   'regressed'   - weight is lower than last time
//   'target-hit'  - same weight, reps meet/exceed the target (ready to add weight next time)
//   'building'    - same weight, more reps than last time but under target
//   'below-last'  - same weight, fewer reps than last time
//   'holding'     - same weight, same reps
export function compareSet(current, last, targetReps) {
  if (!last || current.weight == null || !current.reps) return null
  if (last.weight == null || !last.reps) return null

  const curKg = toKg(Number(current.weight), current.unit)
  const lastKg = toKg(Number(last.weight), last.unit)

  // treat as "same weight" if within a gram of rounding noise
  const EPS = 0.001
  if (curKg > lastKg + EPS) return { status: 'progressing', lastKg, lastReps: last.reps }
  if (curKg < lastKg - EPS) return { status: 'regressed', lastKg, lastReps: last.reps }

  if (targetReps && current.reps >= targetReps) {
    return { status: 'target-hit', lastKg, lastReps: last.reps, targetReps }
  }
  if (current.reps > last.reps) return { status: 'building', lastKg, lastReps: last.reps, targetReps }
  if (current.reps < last.reps) return { status: 'below-last', lastKg, lastReps: last.reps }
  return { status: 'holding', lastKg, lastReps: last.reps }
}
