import { toKg, fmtVolume, volumeMultiplier } from '../lib/format'
import { groupFor } from '../lib/exerciseLibrary'
import { Tally } from './TabBar'

function volumeKg(workout) {
  let total = 0
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      if (set.weight == null || !set.reps || set.warmup) continue
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

// No live rest tracking anymore, so this is a simple estimate rather
// than a measurement: one rest gap assumed between every consecutive
// set in the session, at a standard length. Capped so it never exceeds
// the real recorded Duration - a fast test session with only a few
// real seconds between sets would otherwise show a nonsensical
// negative Active time.
const STANDARD_REST_SECONDS = 90

function estimatedRestMinutes(workout, totalDurationMinutes) {
  // Exercises linked as a superset are done back-to-back with ~0 real
  // rest between them - only counting a rest gap between completed
  // ROUNDS of the group (using its largest member's set count), not
  // between every individual set the way an unlinked exercise does.
  const groups = new Map()
  const solo = []
  for (const ex of workout.exercises) {
    if (ex.superset_group) {
      if (!groups.has(ex.superset_group)) groups.set(ex.superset_group, [])
      groups.get(ex.superset_group).push(ex)
    } else {
      solo.push(ex)
    }
  }

  let gaps = 0
  for (const ex of solo) gaps += Math.max(0, ex.sets.length - 1)
  for (const members of groups.values()) {
    const rounds = Math.max(...members.map((ex) => ex.sets.length))
    gaps += Math.max(0, rounds - 1)
  }

  const rawMinutes = Math.round((gaps * STANDARD_REST_SECONDS) / 60)
  if (totalDurationMinutes == null) return rawMinutes
  return Math.min(rawMinutes, totalDurationMinutes)
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
        const restEst = mins != null ? estimatedRestMinutes(w, mins) : null
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
                  Duration: {formatDuration(mins)} · Rest time (est.): {formatDuration(restEst)} · Active time: {formatDuration(Math.max(0, mins - restEst))}
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
