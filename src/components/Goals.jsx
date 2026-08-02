import { useState } from 'react'
import { saveProfile } from '../lib/db'

export const GOAL_OPTIONS = [
  'Build strength',
  'Build muscle',
  'Lose weight',
  'Gain weight',
  'Improve stamina',
  'General fitness',
]

// Settings-only now - the full-screen onboarding version of this question
// lives in Onboarding.jsx (step 2), alongside the newer goal-driving fields.
export default function Goals({ user, initial, onDone }) {
  const [goals, setGoals] = useState(initial?.goals ?? [])
  const [note, setNote] = useState(initial?.goal_note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function toggle(g) {
    setSaved(false)
    setGoals((list) => (list.includes(g) ? list.filter((x) => x !== g) : [...list, g]))
  }

  async function save() {
    setBusy(true)
    setError('')
    try {
      const payload = { goals, goalNote: note.trim() }
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

  return (
    <>
      <label className="label">Your goals</label>
      {picker}
      <button className="btn btn-block" style={{ marginTop: 10 }} onClick={() => save()} disabled={busy}>
        {busy ? 'Saving…' : 'Save goals'}
      </button>
      {saved && !error && <p className="ok-msg">Goals saved.</p>}
    </>
  )
}
