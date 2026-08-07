import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Tally } from './TabBar'

export default function Auth() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function submit() {
    setError('')
    setInfo('')
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
      <p className="auth-tag">Log your sets. See your progress.</p>

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
        />
      </div>
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

      {error && <p className="error">{error}</p>}
      {info && <p className="ok-msg">{info}</p>}

      <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
        {busy ? 'One sec…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
      <button
        className="btn btn-ghost btn-block"
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}
      >
        {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
