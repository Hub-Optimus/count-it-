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
