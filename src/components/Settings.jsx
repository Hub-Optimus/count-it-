import { supabase } from '../lib/supabase'
import Goals from './Goals'

export default function Settings({ user, workouts, defaultUnit, onUnitChange, profile, onProfileChange }) {
  function exportJson() {
    const payload = {
      app: 'Count It',
      exported_at: new Date().toISOString(),
      workouts: workouts.map((w) => ({
        date: w.date,
        split: w.split,
        notes: w.notes,
        exercises: w.exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets.map((s) => ({
            weight: s.weight,
            unit: s.unit,
            reps: s.reps,
            per_side: s.per_side,
            feel: s.feel,
          })),
        })),
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'countit-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="card">
        <Goals user={user} initial={profile} mode="settings" onDone={onProfileChange} />
      </div>

      <div className="card">
        <label className="label">Default unit for new sets</label>
        <div className="chip-row">
          {['kg', 'lbs'].map((u) => (
            <button key={u} className={`chip ${defaultUnit === u ? 'on' : ''}`} onClick={() => onUnitChange(u)}>
              {u === 'kg' ? 'Kilograms' : 'Pounds'}
            </button>
          ))}
        </div>
        <p className="small">You can still flip the unit on any single set while logging.</p>
      </div>

      <div className="card">
        <label className="label">Your data</label>
        <button className="btn btn-block" onClick={exportJson} disabled={!workouts.length}>
          Export everything as JSON
        </button>
      </div>

      <div className="card">
        <label className="label">Account</label>
        <p className="small" style={{ margin: '0 0 10px' }}>{user.email}</p>
        <button className="btn btn-block" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>

      <p className="small" style={{ textAlign: 'center' }}>Count It · v0.1 · working title</p>
    </div>
  )
}
