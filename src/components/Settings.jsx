import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { insertFullWorkout } from '../lib/db'
import { JULY_2026 } from '../seed/julyLogs'

export default function Settings({ user, workouts, defaultUnit, onUnitChange, onImported }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function importJuly() {
    setMsg('')
    setErr('')
    const existing = workouts.filter((w) => w.date >= '2026-07-01' && w.date <= '2026-07-15')
    if (existing.length > 0 &&
        !window.confirm(`You already have ${existing.length} session(s) between 1-15 July 2026. Importing again will create duplicates. Continue?`)) {
      return
    }
    setBusy(true)
    let count = 0
    try {
      for (const w of JULY_2026) {
        await insertFullWorkout(user.id, w)
        count += 1
      }
      setMsg(`Imported ${count} sessions from July 2026.`)
      onImported()
    } catch (e) {
      setErr(count > 0
        ? `Imported ${count} of ${JULY_2026.length} sessions, then hit: ${e.message}. Tap again to finish (already-imported days will duplicate).`
        : e.message || 'Import failed. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

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
        <button className="btn btn-block" onClick={importJuly} disabled={busy} style={{ marginBottom: 8 }}>
          {busy ? 'Importing…' : 'Import July 2026 logs'}
        </button>
        <button className="btn btn-block" onClick={exportJson} disabled={!workouts.length}>
          Export everything as JSON
        </button>
        {msg && <p className="ok-msg">{msg}</p>}
        {err && <p className="error">{err}</p>}
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
