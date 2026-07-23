import { useEffect, useMemo, useRef, useState } from 'react'
import { insertFullWorkout, updateFullWorkout, deleteWorkout, fetchExerciseTargets, saveExerciseTarget } from '../lib/db'
import { todayISO } from '../lib/format'
import ExercisePicker from './ExercisePicker'
import { pictogramFor, groupFor, GROUP_COLOR } from '../lib/exerciseLibrary'
import { PICTOGRAMS } from '../lib/pictograms'
import { lastSessionFor, compareSet, bestSetEver } from '../lib/setComparison'

const FEELS = [
  { value: 'easy', cls: 'f-easy' },
  { value: 'ok', cls: 'f-ok' },
  { value: 'heavy', cls: 'f-heavy' },
  { value: 'very heavy', cls: 'f-vheavy' },
]
const FEEL_VALUES = FEELS.map((f) => f.value)
const DRAFT_KEY = 'countit-draft-v1'

let seq = 0
const nextKey = () => `k${++seq}`

// Sets pre-filled from history behave exactly like any other set - no
// separate "confirm" step, matching how Strong/Hevy handle this: the
// pre-filled number IS the value, Save is the only confirmation needed.
const blankSet = (unit) => ({ k: nextKey(), weight: '', unit, reps: '', perSide: false, feel: '' })
const blankExercise = (unit) => ({ k: nextKey(), name: '', sets: [blankSet(unit)] })

function historySet(histSet) {
  return {
    k: nextKey(),
    weight: histSet.weight ?? '',
    unit: histSet.unit || 'kg',
    reps: histSet.reps ?? '',
    perSide: Boolean(histSet.per_side),
    feel: '',
  }
}

// db workout -> editable model
function toModel(workout) {
  return workout.exercises.map((ex) => ({
    k: nextKey(),
    name: ex.name,
    sets: ex.sets.map((s) => ({
      k: nextKey(),
      weight: s.weight ?? '',
      unit: s.unit,
      reps: s.reps ?? '',
      perSide: Boolean(s.per_side),
      feel: s.feel || '',
    })),
  }))
}

function readDraft(target) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    return d && d.target === target && Array.isArray(d.exercises) ? d : null
  } catch {
    return null
  }
}

export default function WorkoutEditor({ user, workout, workouts, exerciseNames, defaultUnit, onClose, onSaved }) {
  const target = workout?.id ?? 'new'
  const [date, setDate] = useState(workout?.date ?? todayISO())
  const [notes, setNotes] = useState(workout?.notes ?? '')
  const [exercises, setExercises] = useState(() => (workout ? toModel(workout) : [blankExercise(defaultUnit)]))
  const [draft, setDraft] = useState(() => readDraft(target))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pickerFor, setPickerFor] = useState(null) // exercise key whose picker is open, or null
  const [targets, setTargets] = useState({}) // { 'exercise name lowercase': targetReps }

  useEffect(() => {
    fetchExerciseTargets(user.id).then(setTargets).catch(() => {})
  }, [user.id])

  async function setTargetFor(exerciseName, reps) {
    setTargets((t) => ({ ...t, [exerciseName.trim().toLowerCase()]: reps }))
    try {
      await saveExerciseTarget(user.id, exerciseName.trim(), reps)
    } catch { /* best effort - local state already updated */ }
  }
  const dirtyRef = useRef(false)
  const touch = () => { dirtyRef.current = true }


  // autosave a local draft so a mid-session reload never loses sets
  useEffect(() => {
    if (!dirtyRef.current) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ target, date, notes, exercises, ts: Date.now() }))
      } catch { /* storage full - draft is best effort */ }
    }, 350)
    return () => clearTimeout(t)
  }, [target, date, notes, exercises])

  function resumeDraft() {
    setDate(draft.date)
    setNotes(draft.notes)
    setExercises(draft.exercises.map((ex) => ({ ...ex, k: nextKey(), sets: ex.sets.map((s) => ({ ...s, k: nextKey() })) })))
    dirtyRef.current = true
    setDraft(null)
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setDraft(null)
  }

  const hasContent = () =>
    notes.trim() !== (workout?.notes ?? '') ||
    exercises.some((ex) => ex.name.trim() || ex.sets.some((s) => s.weight !== '' || s.reps !== ''))

  function updateExercise(k, patch) {
    touch()
    setExercises((list) =>
      list.map((ex) => {
        if (ex.k !== k) return ex
        const next = { ...ex, ...patch }
        // auto-fill from history when a name is picked/typed and nothing
        // in this block has been confirmed yet - never overwrites real data
        if (patch.name != null) {
          const nothingEntered = ex.sets.every((s) => s.weight === '' && s.reps === '')
          const hist = patch.name.trim() ? lastSessionFor(workouts, patch.name, workout?.id) : null
          if (hist && nothingEntered) {
            next.sets = [historySet(hist.sets[0])]
          }
        }
        return next
      })
    )
  }

  function updateSet(exK, setK, patch) {
    touch()
    setExercises((list) =>
      list.map((ex) =>
        ex.k === exK
          ? { ...ex, sets: ex.sets.map((s) => (s.k === setK ? { ...s, ...patch } : s)) }
          : ex
      )
    )
  }

  function addSet(exK) {
    touch()
    setExercises((list) =>
      list.map((ex) => {
        if (ex.k !== exK) return ex
        const hist = ex.name.trim() ? lastSessionFor(workouts, ex.name, workout?.id) : null
        const histNext = hist?.sets?.[ex.sets.length]
        if (histNext) {
          return { ...ex, sets: [...ex.sets, historySet(histNext)] }
        }
        const last = ex.sets[ex.sets.length - 1]
        const copy = last
          ? { k: nextKey(), weight: last.weight, unit: last.unit, reps: last.reps, perSide: last.perSide, feel: '' }
          : blankSet(defaultUnit)
        return { ...ex, sets: [...ex.sets, copy] }
      })
    )
  }

  function removeSet(exK, setK) {
    touch()
    setExercises((list) => list.map((ex) => (ex.k === exK ? { ...ex, sets: ex.sets.filter((s) => s.k !== setK) } : ex)))
  }

  function addExercise() {
    touch()
    setExercises((list) => [...list, blankExercise(defaultUnit)])
  }

  function removeExercise(exK) {
    const ex = exercises.find((e) => e.k === exK)
    const filled = ex && (ex.name.trim() || ex.sets.some((s) => s.weight !== '' || s.reps !== ''))
    if (filled && !window.confirm(`Remove ${ex.name.trim() || 'this exercise'}?`)) return
    touch()
    setExercises((list) => list.filter((e) => e.k !== exK))
  }

  function copyPreviousSession() {
    const src = workouts.find((w) => w.id !== workout?.id)
    if (!src) return
    if (exercises.some((ex) => ex.name.trim() || ex.sets.some((s) => s.weight !== '' || s.reps !== '')) &&
        !window.confirm(`Replace the current entries with your ${src.date} session?`)) return
    touch()
    setExercises(toModel(src).map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s, feel: '' })) })))
  }

  function cancel() {
    if (dirtyRef.current && hasContent() && !window.confirm('Discard changes?')) return
    if (dirtyRef.current) localStorage.removeItem(DRAFT_KEY) // keep an un-resumed draft recoverable
    onClose()
  }

  async function removeWholeWorkout() {
    if (!window.confirm('Delete this whole workout? This cannot be undone.')) return
    setSaving(true)
    try {
      await deleteWorkout(workout.id)
      localStorage.removeItem(DRAFT_KEY)
      onSaved()
    } catch (e) {
      setError(e.message || 'Could not delete. Check your connection and try again.')
      setSaving(false)
    }
  }

  async function save() {
    setError('')

    const payload = exercises
      .map((ex) => ({
        name: ex.name.trim(),
        sets: ex.sets
          .filter((s) => s.weight !== '' || s.reps !== '')
          .map((s) => {
            const w = s.weight === '' ? null : parseFloat(s.weight)
            const r = s.reps === '' ? null : parseInt(s.reps, 10)
            return {
              weight: Number.isFinite(w) ? w : null,
              unit: s.unit,
              reps: Number.isFinite(r) ? r : null,
              perSide: s.perSide,
              feel: s.feel.trim() || null,
            }
          }),
      }))
      .filter((ex) => ex.name && ex.sets.length)

    if (!payload.length) { setError('Add at least one exercise with a set.'); return }

    setSaving(true)
    try {
      const body = { date, split: workout?.split ?? null, notes: notes.trim() || null, exercises: payload }
      if (workout) await updateFullWorkout(user.id, workout.id, body)
      else await insertFullWorkout(user.id, body)
      localStorage.removeItem(DRAFT_KEY)
      onSaved()
    } catch (e) {
      setError(e.message || 'Could not save. Your entries are kept on this phone - try again when you have signal.')
      setSaving(false)
    }
  }

  return (
    <div className="app">
      <div className="editor-topbar">
        <button className="btn btn-ghost" onClick={cancel}>Cancel</button>
        <div className="screen-title">{workout ? 'Edit session' : 'New session'}</div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {draft && (
        <div className="banner">
          <span>You have an unsaved draft from this device.</span>
          <span className="banner-actions">
            <button className="btn btn-ghost" onClick={discardDraft}>Discard</button>
            <button className="btn" onClick={resumeDraft}>Resume</button>
          </span>
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor="w-date">Date</label>
        <input id="w-date" className="input" type="date" value={date} onChange={(e) => { touch(); setDate(e.target.value) }} />
      </div>

      {!workout && workouts.length > 0 && (
        <button className="btn btn-block" onClick={copyPreviousSession}>
          Copy previous session
        </button>
      )}

      <hr className="hr" />

      <div className="exercise-grid">
      {exercises.map((ex, exIdx) => {
        const ExPic = PICTOGRAMS[pictogramFor(ex.name)]
        const exColor = GROUP_COLOR[groupFor(ex.name)] || GROUP_COLOR.Other
        const lastSession = ex.name.trim() ? lastSessionFor(workouts, ex.name, workout?.id) : null
        const bestSet = ex.name.trim() ? bestSetEver(workouts, ex.name, workout?.id) : null
        const targetReps = targets[ex.name.trim().toLowerCase()] || null
        return (
        <div className="exercise-block" key={ex.k}>
          <div className="exercise-head">
            {ExPic && (
              <span className="exercise-thumb" style={{ background: exColor + '26' }}>
                <ExPic width="30" height="30" />
              </span>
            )}
            <input
              className="input"
              placeholder={`Exercise ${exIdx + 1}`}
              value={ex.name}
              onChange={(e) => updateExercise(ex.k, { name: e.target.value })}
            />
            <button className="mini-btn browse-btn" onClick={() => setPickerFor(ex.k)} aria-label="Browse exercises" title="Browse exercises">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10.5" cy="10.5" r="6.5" /><line x1="20" y1="20" x2="15.5" y2="15.5" />
              </svg>
            </button>
            <button className="btn btn-ghost" onClick={() => removeExercise(ex.k)} aria-label="Remove exercise">✕</button>
          </div>

          {pickerFor === ex.k && (
            <ExercisePicker
              recentNames={exerciseNames}
              onSelect={(name) => updateExercise(ex.k, { name })}
              onClose={() => setPickerFor(null)}
            />
          )}

          {(bestSet || ex.name.trim()) && (
            <div className="last-time-row">
              {bestSet ? (
                <span className="small">
                  🏆 Best: <strong style={{ color: 'var(--ink)' }}>{bestSet.weight}{bestSet.unit === 'lbs' ? 'lb' : 'kg'}×{bestSet.reps}{bestSet.perSide ? '/side' : ''}</strong>
                </span>
              ) : <span className="small">No history for this exercise yet</span>}
              {targetReps ? (
                <button className="target-chip" onClick={() => { const v = window.prompt('Target reps for this exercise', String(targetReps)); const n = parseInt(v, 10); if (Number.isFinite(n) && n > 0) setTargetFor(ex.name, n) }}>
                  🎯 {targetReps} rep target
                </button>
              ) : (
                <button className="target-chip target-chip-empty" onClick={() => { const v = window.prompt(`Set a rep target for ${ex.name.trim()}? (e.g. 15)`); const n = parseInt(v, 10); if (Number.isFinite(n) && n > 0) setTargetFor(ex.name, n) }}>
                  + Set target
                </button>
              )}
            </div>
          )}

          {ex.sets.map((s, i) => {
            const customFeel = s.feel && !FEEL_VALUES.includes(s.feel)
            const lastSet = lastSession?.sets?.[i]
            const cmp = compareSet(s, lastSet, targetReps)
            return (
              <div key={s.k}>
                {cmp && (
                  <div className={`set-compare set-compare-${cmp.status}`}>
                    {cmp.status === 'progressing' && `↑ Up from last time (was ${cmp.lastKg}kg)`}
                    {cmp.status === 'regressed' && `↓ Down from last time (was ${cmp.lastKg}kg)`}
                    {cmp.status === 'target-hit' && `🎯 Target hit — try more weight next time`}
                    {cmp.status === 'building' && `Building — ${cmp.targetReps - s.reps} more reps to target`}
                    {cmp.status === 'below-last' && `↓ Fewer reps than last time (was ${cmp.lastReps})`}
                    {cmp.status === 'holding' && `Same as last time`}
                  </div>
                )}
                <div className="set-row">
                  <span className="set-index">{i + 1}</span>
                  <input
                    className="input"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    name={`weight-${s.k}`}
                    placeholder="weight"
                    aria-label={`Set ${i + 1} weight`}
                    value={s.weight}
                    onChange={(e) => updateSet(ex.k, s.k, { weight: e.target.value })}
                  />
                  <button
                    className="mini-btn"
                    onClick={() => updateSet(ex.k, s.k, { unit: s.unit === 'kg' ? 'lbs' : 'kg' })}
                    aria-label="Toggle unit"
                  >
                    {s.unit === 'kg' ? 'kg' : 'lb'}
                  </button>
                  <span className="times">×</span>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    name={`reps-${s.k}`}
                    placeholder="reps"
                    aria-label={`Set ${i + 1} reps`}
                    value={s.reps}
                    onChange={(e) => updateSet(ex.k, s.k, { reps: e.target.value })}
                  />
                  <button
                    className={`mini-btn ${s.perSide ? 'on' : ''}`}
                    onClick={() => updateSet(ex.k, s.k, { perSide: !s.perSide })}
                    title="Weight is per side / per hand"
                  >
                    /side
                  </button>
                  <button className="remove-set" onClick={() => removeSet(ex.k, s.k)} aria-label={`Remove set ${i + 1}`}>–</button>
                </div>
                <div className="set-feel">
                  {customFeel ? (
                    <span className="feel-note">
                      <span>{s.feel}</span>
                      <button onClick={() => updateSet(ex.k, s.k, { feel: '' })} aria-label="Clear note">✕</button>
                    </span>
                  ) : (
                    FEELS.map((f) => (
                      <button
                        key={f.value}
                        className={`chip feel-chip ${f.cls} ${s.feel === f.value ? 'on' : ''}`}
                        onClick={() => updateSet(ex.k, s.k, { feel: s.feel === f.value ? '' : f.value })}
                      >
                        {f.value}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )
          })}

          <button className="btn btn-block" onClick={() => addSet(ex.k)}>+ Set</button>
        </div>
        )
      })}
      </div>

      <button className="btn btn-block" onClick={addExercise}>+ Exercise</button>

      <div className="field" style={{ marginTop: 14 }}>
        <label className="label" htmlFor="w-notes">Session notes</label>
        <textarea
          id="w-notes"
          className="textarea"
          placeholder="Cardio, aches, anything worth remembering"
          value={notes}
          onChange={(e) => { touch(); setNotes(e.target.value) }}
        />
      </div>

      {error && <p className="error">{error}</p>}

      <div className="editor-footer">
        {workout && (
          <button className="btn btn-danger" onClick={removeWholeWorkout} disabled={saving}>
            Delete workout
          </button>
        )}
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save session'}
        </button>
      </div>
    </div>
  )
}
