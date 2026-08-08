import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tally } from './TabBar'

export default function Auth() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  function switchMode(next) {
    setMode(next)
    setError('')
    setInfo('')
  }

  async function submit() {
    setError('')
    setInfo('')

    if (mode === 'reset') {
      if (!email.trim()) {
        setError('Enter your email.')
        return
      }
      setBusy(true)
      try {
        // Same-origin redirect - matches the Site URL already configured
        // in Supabase, so no extra Redirect URLs allow-list entry needed.
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setInfo('Check your email for a password reset link.')
      } catch (e) {
        setError(e.message || 'Something went wrong. Try again.')
      } finally {
        setBusy(false)
      }
      return
    }

    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
        if (!data.session) {
          setInfo('Account created. Check your email for the confirmation link, then sign in.')
          setMode('signin')
        }
      }
    } catch (e) {
      setError(e.message === 'Invalid login credentials' ? 'Wrong email or password.' : e.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-logo">
        <Tally size={40} />
        <div className="auth-title">Count It</div>
      </div>
      <p className="auth-tag">
        {mode === 'reset' ? "Enter your email and we'll send you a reset link." : 'Log your sets. See your progress.'}
      </p>

      <div className="field">
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>

      {mode !== 'reset' && (
        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
      )}

      {mode === 'signin' && (
        <button type="button" className="text-link-btn" onClick={() => switchMode('reset')}>
          Forgot password?
        </button>
      )}

      {error && <p className="error">{error}</p>}
      {info && <p className="ok-msg">{info}</p>}

      <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
        {busy ? 'One sec…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
      </button>

      {mode === 'reset' ? (
        <button className="btn btn-ghost btn-block" onClick={() => switchMode('signin')}>
          Back to sign in
        </button>
      ) : (
        <button
          className="btn btn-ghost btn-block"
          onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      )}
    </div>
  )
}