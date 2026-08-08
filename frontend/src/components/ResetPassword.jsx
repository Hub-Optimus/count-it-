import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tally } from './TabBar'

// Shown instead of the normal app/login screen when Supabase detects a
// password-recovery link (App.jsx watches for the PASSWORD_RECOVERY auth
// event). The session from the recovery link is already active at this
// point, so updateUser() just needs the new password - no old password,
// no separate token handling.
export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit() {
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setBusy(false)
      setError(error.message || 'Something went wrong. Try again.')
      return
    }
    setDone(true)
    // Scrub the token out of the URL so refreshing this tab can't
    // re-trigger the recovery flow or leave it sitting in history.
    window.history.replaceState(null, '', window.location.pathname)
    // Sign out of the recovery session and send them back to the normal
    // sign-in screen, so they confirm the new password actually works
    // rather than silently staying logged in.
    await supabase.auth.signOut()
    setTimeout(onDone, 1500)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-logo">
        <Tally size={40} />
        <div className="auth-title">Count It</div>
      </div>

      {done ? (
        <>
          <p className="auth-tag">Password updated. Redirecting to sign in…</p>
        </>
      ) : (
        <>
          <p className="auth-tag">Set a new password.</p>
          <div className="field">
            <label className="label" htmlFor="new-password">New password</label>
            <input
              id="new-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              autoFocus
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
            {busy ? 'One sec…' : 'Update password'}
          </button>
        </>
      )}
    </div>
  )
}