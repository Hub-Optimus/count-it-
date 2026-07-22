import { toKg, fmtVolume } from '../lib/format'
import { Tally } from './TabBar'

function volumeKg(workout) {
  let total = 0
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      if (set.weight == null || !set.reps) continue
      total += toKg(Number(set.weight), set.unit) * set.reps * (set.per_side ? 2 : 1)
    }
  }
  return total
}

export default function WorkoutList({ workouts, onOpen }) {
  if (!workouts.length) {
    return (
      <div className="empty">
        <Tally size={44} />
        <p>No sessions yet.</p>
        <p className="small">Tap + to log your first workout, or import your July logs from Settings.</p>
      </div>
    )
  }

  return (
    <div>
      {workouts.map((w) => {
        const d = new Date(w.date + 'T00:00:00')
        const setCount = w.exercises.reduce((n, ex) => n + ex.sets.length, 0)
        const vol = volumeKg(w)
        return (
          <button key={w.id} className="workout-card" onClick={() => onOpen(w)}>
            <span className="wc-date">
              <span className="wc-day">{d.getDate()}</span>
              <span className="wc-month">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
            </span>
            <span>
              <span className="wc-split">{w.split}</span>
              <div className="wc-meta">
                {w.exercises.length} exercises · {setCount} sets{vol > 0 ? ` · ${fmtVolume(vol)}` : ''}
              </div>
              {w.notes && <div className="wc-notes">{w.notes}</div>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
