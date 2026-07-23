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
