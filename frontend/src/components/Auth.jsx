import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { saveRole } from '../lib/db'
import { Tally } from './TabBar'

const ACCOUNT_TYPES = [
  { id: 'individual', label: 'Individual' },
  { id: 'owner', label: 'Gym Owner' },
  { id: 'trainer', label: 'Trainer' },
]

export default function Auth() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
  const [accountType, setAccountType] = useState('individual')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [gymName, setGymName] = useState('')
  const [contact, setContact] = useState('')
  const [gymCode, setGymCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  function switchMode(next) {
    setMode(next)
    setError('')
    setInfo('')
  }

  // Saves the role/gym-specific fields right after signup. If email
  // confirmation is required, there's no session yet to call the
  // backend with - stash it and App.jsx applies it the moment this
  // person actually signs in for the first time.
  async function completeRoleSetup(signupEmail) {
    const roleData = {
      role: accountType,
      ownerName: ownerName.trim() || null,
      gymName: gymName.trim() || null,
      contact: contact.trim() || null,
      gymCode: gymCode.trim() || null,
    }
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      await saveRole(roleData)
    } else {
      localStorage.setItem(`countit_pending_role:${signupEmail.toLowerCase()}`, JSON.stringify(roleData))
    }
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
    if (mode === 'signup') {
      if (accountType === 'owner' && (!ownerName.trim() || !gymName.trim())) {
        setError('Enter your name and your gym name.')
        return
      }
      if (accountType === 'trainer' && !gymCode.trim()) {
        setError("Enter the gym code your gym owner gave you.")
        return
      }
    }

    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
        await completeRoleSetup(email.trim())
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

      {mode === 'signup' && (
        <div className="field">
          <label className="label">Account type</label>
          <div className="chip-row">
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`chip ${accountType === t.id ? 'on' : ''}`}
                onClick={() => setAccountType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'signup' && accountType === 'owner' && (
        <div className="field">
          <label className="label" htmlFor="owner-name">Your name</label>
          <input id="owner-name" className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        </div>
      )}
      {mode === 'signup' && accountType === 'owner' && (
        <div className="field">
          <label className="label" htmlFor="gym-name">Gym name</label>
          <input id="gym-name" className="input" value={gymName} onChange={(e) => setGymName(e.target.value)} />
        </div>
      )}

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

      {mode === 'signup' && (accountType === 'owner' || accountType === 'trainer') && (
        <div className="field">
          <label className="label" htmlFor="contact">Contact number</label>
          <input
            id="contact"
            className="input"
            type="tel"
            inputMode="tel"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
      )}

      {mode === 'signup' && accountType === 'trainer' && (
        <div className="field">
          <label className="label" htmlFor="gym-code">Gym code (from your gym owner)</label>
          <input
            id="gym-code"
            className="input"
            style={{ textTransform: 'uppercase' }}
            placeholder="e.g. 4XKQ7T"
            value={gymCode}
            onChange={(e) => setGymCode(e.target.value)}
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