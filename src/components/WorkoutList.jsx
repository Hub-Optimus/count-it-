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

// "3h 30m" instead of "210 min" - and "45m" (not "0h 45m") under an hour.
function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// Total wall-clock session length - null for older workouts logged
// before this was tracked, so callers must handle the absent case.
function durationMinutes(workout) {
  if (!workout.started_at || !workout.finished_at) return null
  const ms = new Date(workout.finished_at) - new Date(workout.started_at)
  if (!Number.isFinite(ms) || ms <= 0) return null
  return Math.round(ms / 60000)
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
        return (
          <button key={w.id} className="workout-card" onClick={() => onOpen(w)}>
            <span className="wc-date">
              <span className="wc-day">{d.getDate()}</span>
              <span className="wc-month">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
            </span>
            <span>
              <span className="wc-split">{heading}</span>
              <div className="wc-meta">
                {w.exercises.length} exercises · {setCount} sets{vol > 0 ? ` · ${fmtVolume(vol)}` : ''}
              </div>
              {mins != null && (
                <div className="wc-notes">
                  Duration: {formatDuration(mins)}
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
