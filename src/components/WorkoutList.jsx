import { toKg, fmtVolume, volumeMultiplier } from '../lib/format'
import { groupFor } from '../lib/exerciseLibrary'
import { Tally } from './TabBar'

function volumeKg(workout) {
  let total = 0
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      if (set.weight == null || !set.reps) continue
      total += toKg(Number(set.weight), set.unit) * set.reps * volumeMultiplier(set)
    }
  }
  return total
}

// Total wall-clock session length - null for older workouts logged
// before this was tracked, so callers must handle the absent case.
function durationMinutes(workout) {
  if (!workout.started_at || !workout.finished_at) return null
  const ms = new Date(workout.finished_at) - new Date(workout.started_at)
  if (!Number.isFinite(ms) || ms <= 0) return null
  return Math.round(ms / 60000)
}

// Sum of actual rest-timer durations across every set that had one
// running, vs. what those timers were actually set to - the gap between
// the two is genuine "extra" time beyond planned rest, not a guess.
function restBreakdown(workout) {
  let actual = 0
  let target = 0
  let any = false
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      if (set.rest_actual_seconds == null) continue
      any = true
      actual += set.rest_actual_seconds
      target += set.rest_target_seconds ?? 0
    }
  }
  if (!any) return null
  return { actualMinutes: Math.round(actual / 60), targetMinutes: Math.round(target / 60) }
}

// First-appearance-ordered, deduped muscle groups actually trained in this session.
function musclesFor(workout) {
  const seen = []
  for (const ex of workout.exercises) {
    const g = groupFor(ex.name)
    if (g && !seen.includes(g)) seen.push(g)
  }
  return seen
}

export default function WorkoutList({ workouts, onOpen }) {
  if (!workouts.length) {
    return (
      <div className="empty">
        <Tally size={44} />
        <p>No sessions yet.</p>
        <p className="small">Tap + to log your first workout.</p>
      </div>
    )
  }

  return (
    <div className="workout-grid">
      {workouts.map((w) => {
        const d = new Date(w.date + 'T00:00:00')
        const setCount = w.exercises.reduce((n, ex) => n + ex.sets.length, 0)
        const vol = volumeKg(w)
        const muscles = musclesFor(w)
        const heading = w.split || (muscles.length ? muscles.join(' + ') : 'Workout')
        const mins = durationMinutes(w)
        const rest = restBreakdown(w)
        return (
          <button key={w.id} className="workout-card" onClick={() => onOpen(w)}>
            <span className="wc-date">
              <span className="wc-day">{d.getDate()}</span>
              <span className="wc-month">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
            </span>
            <span>
              <span className="wc-split">{heading}</span>
              <div className="wc-meta">
                {w.exercises.length} exercises · {setCount} sets{vol > 0 ? ` · ${fmtVolume(vol)}` : ''}{mins != null ? ` · ${mins} min` : ''}
              </div>
              {rest && (
                <div className="wc-notes">
                  {rest.actualMinutes} min resting{rest.targetMinutes > 0 ? ` (planned ${rest.targetMinutes})` : ''}
                </div>
              )}
              {w.split && muscles.length > 0 && <div className="wc-notes">{muscles.join(' + ')}</div>}
              {w.notes && <div className="wc-notes">{w.notes}</div>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
