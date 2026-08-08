import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchBodyMetrics } from '../lib/db'
import Goals from './Goals'
import BodyMetrics from './BodyMetrics'

// Requires the current password before accepting a new one - Supabase's
// updateUser() alone trusts the existing session and won't ask for it, so
// this re-authenticates with the old password first as the actual check.
function ChangePassword({ email }) {
  const [open, setOpen] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  function reset() {
    setOpen(false)
    setOldPassword('')
    setNewPassword('')
    setConfirm('')
    setError('')
    setOk('')
  }

  async function submit() {
    setError('')
    setOk('')
    if (!oldPassword) {
      setError('Enter your current password.')
      return
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirm) {
      setError("New passwords don't match.")
      return
    }
    setBusy(true)
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: oldPassword })
    if (reauthError) {
      setBusy(false)
      setError('Current password is incorrect.')
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setBusy(false)
    if (updateError) {
      setError(updateError.message || 'Something went wrong. Try again.')
      return
    }
    setOldPassword('')
    setNewPassword('')
    setConfirm('')
    setOk('Password changed. Redirecting to sign in…')
    setTimeout(() => { supabase.auth.signOut() }, 1500)
  }

  if (!open) {
    return (
      <button className="btn btn-block" onClick={() => setOpen(true)}>
        Change password
      </button>
    )
  }

  return (
    <div>
      <div className="field">
        <label className="label" htmlFor="old-password">Current password</label>
        <input
          id="old-password"
          className="input"
          type="password"
          autoComplete="current-password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          autoFocus
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="new-password-settings">New password</label>
        <input
          id="new-password-settings"
          className="input"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="confirm-password-settings">Confirm new password</label>
        <input
          id="confirm-password-settings"
          className="input"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>

      {error && <p className="error">{error}</p>}
      {ok && <p className="ok-msg">{ok}</p>}

      <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
        {busy ? 'Updating…' : 'Update password'}
      </button>
      <button className="btn btn-block" onClick={reset} disabled={busy}>
        Cancel
      </button>
    </div>
  )
}

export default function Settings({ user, workouts, defaultUnit, onUnitChange, profile, onProfileChange }) {
  const [bodyMetrics, setBodyMetrics] = useState([])

  const loadMetrics = () => fetchBodyMetrics(user.id).then(setBodyMetrics).catch(() => {})
  useEffect(() => { loadMetrics() }, [user.id])

  function exportJson() {
    const payload = {
      app: 'Count It',
      exported_at: new Date().toISOString(),
      workouts: workouts.map((w) => ({
        date: w.date,
        split: w.split,
        notes: w.notes,
        started_at: w.started_at,
        finished_at: w.finished_at,
        exercises: w.exercises.map((ex) => ({
          name: ex.name,
          notes: ex.notes,
          sets: ex.sets.map((s) => ({
            weight: s.weight,
            unit: s.unit,
            reps: s.reps,
            per_side: s.per_side,
            side: s.side,
            warmup: s.warmup,
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
        <Goals user={user} initial={profile} onDone={onProfileChange} />
      </div>

      <div className="card">
        <BodyMetrics
          user={user}
          height={profile?.height_cm}
          bodyMetrics={bodyMetrics}
          onHeightChange={(h) => onProfileChange({ ...profile, height_cm: h })}
          onMetricsChange={loadMetrics}
        />
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
        <ChangePassword email={user.email} />
        <div style={{ height: 8 }} />
        <button className="btn btn-block" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>

      <p className="small" style={{ textAlign: 'center' }}>Count It · v0.1 · working title</p>
    </div>
  )
}