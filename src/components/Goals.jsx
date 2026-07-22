import { useState } from 'react'
import { saveProfile } from '../lib/db'
import { Tally } from './TabBar'

export const GOAL_OPTIONS = [
  'Build strength',
  'Build muscle',
  'Lose weight',
  'Gain weight',
  'Improve stamina',
  'General fitness',
]

// mode: 'onboard' (full screen after signup) | 'settings' (card content)
export default function Goals({ user, initial, mode = 'settings', onDone }) {
  const [goals, setGoals] = useState(initial?.goals ?? [])
  const [note, setNote] = useState(initial?.goal_note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function toggle(g) {
    setSaved(false)
    setGoals((list) => (list.includes(g) ? list.filter((x) => x !== g) : [...list, g]))
  }

  async function save(skip = false) {
    setBusy(true)
    setError('')
    try {
      const payload = skip ? { goals: [], goalNote: '' } : { goals, goalNote: note.trim() }
      await saveProfile(user.id, payload)
      setSaved(true)
      onDone?.({ goals: payload.goals, goal_note: payload.goalNote || null })
    } catch (e) {
      setError(e.message || 'Could not save. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const picker = (
    <>
      <div className="chip-row">
        {GOAL_OPTIONS.map((g) => (
          <button key={g} className={`chip ${goals.includes(g) ? 'on' : ''}`} onClick={() => toggle(g)}>
            {g}
          </button>
        ))}
      </div>
      <input
        className="input"
        placeholder="Something else? Type it here"
        value={note}
        onChange={(e) => { setSaved(false); setNote(e.target.value) }}
      />
      {error && <p className="error">{error}</p>}
    </>
  )

  if (mode === 'onboard') {
    return (
      <div className="auth-wrap">
        <div className="auth-logo">
          <Tally size={40} />
          <div className="auth-title">Count It</div>
        </div>
        <p className="auth-tag">What are you training for? Pick as many as apply — this will shape your progress charts.</p>
        {picker}
        <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => save(false)} disabled={busy}>
          {busy ? 'Saving…' : 'Save & start'}
        </button>
        <button className="btn btn-ghost btn-block" onClick={() => save(true)} disabled={busy}>
          Skip for now
        </button>
      </div>
    )
  }

  return (
    <>
      <label className="label">Your goals</label>
      {picker}
      <button className="btn btn-block" style={{ marginTop: 10 }} onClick={() => save(false)} disabled={busy}>
        {busy ? 'Saving…' : 'Save goals'}
      </button>
      {saved && !error && <p className="ok-msg">Goals saved.</p>}
    </>
  )
}
