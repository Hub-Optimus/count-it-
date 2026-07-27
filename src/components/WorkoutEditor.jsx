import { useEffect, useMemo, useRef, useState } from 'react'
import { insertFullWorkout, updateFullWorkout, deleteWorkout, fetchExerciseTargets, saveExerciseTarget, setTrackSides } from '../lib/db'
import { todayISO, toKg } from '../lib/format'
import ExercisePicker from './ExercisePicker'
import { pictogramFor, groupFor, GROUP_COLOR } from '../lib/exerciseLibrary'
import { PICTOGRAMS } from '../lib/pictograms'
import { lastSessionFor, bestSetEver, averageRepsEver, averageWeightEver, hitTargetLastTime } from '../lib/setComparison'
import { peekDraft, clearDraft, DRAFT_KEY } from '../lib/draft'

// Synthesized tone instead of a bundled audio file - avoids adding a new
// asset to his manual GitHub-upload workflow, and works the moment the
// tab is in the foreground with no extra permissions needed. Best-effort
// only: silently no-ops if the Web Audio API isn't available.
function playRestBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch { /* audio unavailable - the visual countdown still works fine */ }
}

function formatMMSS(totalSeconds) {
  const sign = totalSeconds < 0 ? '-' : ''
  const abs = Math.abs(totalSeconds)
  const m = Math.floor(abs / 60)
  const s = abs % 60
  return `${sign}${m}:${String(s).padStart(2, '0')}`
}

const FEELS = [
  { value: 'easy', cls: 'f-easy', emoji: '😊', num: '1' },
  { value: 'ok', cls: 'f-ok', emoji: '🙂', num: '2' },
  { value: 'heavy', cls: 'f-heavy', emoji: '😓', num: '3' },
  { value: 'very heavy', cls: 'f-vheavy', emoji: '🥵', num: '4' },
]
const FEEL_VALUES = FEELS.map((f) => f.value)

// Shown once, the very first time anyone taps "+ Side" anywhere in the
// app - the button itself is just 2 letters with no room for an
// explanation, so this fills that gap without adding permanent clutter.
const SIDES_INTRO_KEY = 'countit_sides_intro_seen_v1'

// Fixed default per Strong/Hevy's usual starting point - adjustable live
// via +/-15s on the timer itself, no per-exercise custom default for v1.
const DEFAULT_REST_SECONDS = 90

let seq = 0
const nextKey = () => `k${++seq}`

// Sets pre-filled from history behave exactly like any other set - no
// separate "confirm" step, matching how Strong/Hevy handle this: the
// pre-filled number IS the value, Save is the only confirmation needed.
const blankSet = (unit) => ({ k: nextKey(), weight: '', unit, reps: '', perSide: false, side: null, feel: '', restTarget: null, restActual: null })
const blankExercise = (unit) => ({ k: nextKey(), name: '', sets: [blankSet(unit)], collapsed: false, notes: '', notesOpen: false })

function historySet(histSet) {
  return {
    k: nextKey(),
    weight: histSet.weight ?? '',
    unit: histSet.unit || 'kg',
    reps: histSet.reps ?? '',
    perSide: Boolean(histSet.per_side),
    side: histSet.side || null,
    feel: '',
    // A past session's rest period belongs to that session, not today's
    // fresh set - always starts untracked regardless of what history says.
    restTarget: null,
    restActual: null,
  }
}

// db workout -> editable model
function toModel(workout) {
  return workout.exercises.map((ex) => ({
    k: nextKey(),
    name: ex.name,
    collapsed: false,
    notes: ex.notes || '',
    sets: ex.sets.map((s) => ({
      k: nextKey(),
      weight: s.weight ?? '',
      unit: s.unit,
      reps: s.reps ?? '',
      perSide: Boolean(s.per_side),
      side: s.side || null,
      feel: s.feel || '',
      restTarget: s.rest_target_seconds ?? null,
      restActual: s.rest_actual_seconds ?? null,
    })),
  }))
}

function readDraft(target) {
  const d = peekDraft()
  return d && d.target === target ? d : null
}

export default function WorkoutEditor({ user, workout, workouts, exerciseNames, defaultUnit, onClose, onSaved }) {
  const target = workout?.id ?? 'new'
  // The k1/k2/... exercise keys are the same on every single page load
  // (the counter restarts each time), so a name built only from them is
  // identical every visit - if a browser or password-manager extension
  // ever tagged that exact name once, it keeps reapplying that treatment
  // forever since the name never changes to signal "this is different
  // now." A random per-mount salt breaks that stale association.
  const sessionSalt = useMemo(() => Math.random().toString(36).slice(2, 8), [])
  const [date, setDate] = useState(workout?.date ?? todayISO())
  // Captured once per editor mount - preserved across edits of an
  // existing workout, fresh for a genuinely new one. This is the true
  // wall-clock session start, independent of when any set gets logged.
  const [startedAt] = useState(() => workout?.started_at ?? new Date().toISOString())
  // Rest timer: { startedAt (ms, Date.now()), targetSeconds, exK, setK }.
  // Global to the whole session (not per-exercise) - starting any new
  // set anywhere finalizes whatever was running and starts the next one.
  const [rest, setRest] = useState(null)
  const [, forceTick] = useState(0)
  const playedDoneSoundRef = useRef(false)

  useEffect(() => {
    if (!rest) return
    const id = setInterval(() => forceTick((t) => t + 1), 500)
    return () => clearInterval(id)
  }, [rest])

  useEffect(() => {
    playedDoneSoundRef.current = false
  }, [rest?.startedAt])

  const restElapsedSeconds = rest ? Math.floor((Date.now() - rest.startedAt) / 1000) : 0
  const restRemainingSeconds = rest ? rest.targetSeconds - restElapsedSeconds : 0

  useEffect(() => {
    if (rest && restRemainingSeconds <= 0 && !playedDoneSoundRef.current) {
      playedDoneSoundRef.current = true
      playRestBeep()
      try { navigator.vibrate?.(200) } catch { /* not supported - visual countdown still works */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restRemainingSeconds > 0])

  function finalizeRest() {
    if (!rest) return
    const actualSeconds = Math.max(0, Math.round((Date.now() - rest.startedAt) / 1000))
    const { exK, setK, targetSeconds } = rest
    setExercises((list) =>
      list.map((ex) =>
        ex.k === exK
          ? { ...ex, sets: ex.sets.map((s) => (s.k === setK ? { ...s, restTarget: targetSeconds, restActual: actualSeconds } : s)) }
          : ex
      )
    )
    setRest(null)
  }

  function startRestFollowing(exK, setK) {
    if (rest) finalizeRest()
    setRest({ startedAt: Date.now(), targetSeconds: DEFAULT_REST_SECONDS, exK, setK })
  }

  function adjustRest(deltaSeconds) {
    setRest((r) => (r ? { ...r, targetSeconds: Math.max(0, r.targetSeconds + deltaSeconds) } : r))
  }

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

  async function setTargetFor(exerciseName, reps, seedWeight = null, seedWeightUnit = null) {
    const key = exerciseName.trim().toLowerCase()
    setTargets((t) => ({ ...t, [key]: { ...t[key], reps, seedWeight, seedWeightUnit } }))
    try {
      await saveExerciseTarget(user.id, exerciseName.trim(), reps, seedWeight, seedWeightUnit)
    } catch { /* best effort - local state already updated */ }
  }

  function maybeExplainThenEnableSides(exerciseName) {
    try {
      if (!localStorage.getItem(SIDES_INTRO_KEY)) {
        window.alert(
          'Track left & right separately for this exercise.\n\n' +
          'Each set gets an L or R tag — tap it to switch sides.\n\n' +
          'Tap the "Tracking left/right" chip again anytime to turn this back off.'
        )
        localStorage.setItem(SIDES_INTRO_KEY, '1')
      }
    } catch { /* localStorage unavailable - skip the one-time explainer, not critical */ }
    enableTrackSides(exerciseName)
  }

  async function enableTrackSides(exerciseName) {
    const key = exerciseName.trim().toLowerCase()
    setTargets((t) => ({ ...t, [key]: { ...t[key], trackSides: true } }))
    // Seed every set already in this exercise with an alternating L/R,
    // not just the first one - otherwise turning this on after sets 2+
    // already exist (e.g. pulled in from history) leaves them stuck on
    // the ambiguous unset "L/R" state until manually tapped.
    setExercises((list) =>
      list.map((ex) => {
        if (ex.name.trim().toLowerCase() !== key) return ex
        let side = 'L'
        return {
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.side) { side = s.side === 'L' ? 'R' : 'L'; return s }
            const seeded = { ...s, side }
            side = side === 'L' ? 'R' : 'L'
            return seeded
          }),
        }
      })
    )
    try {
      await setTrackSides(user.id, exerciseName.trim(), true)
    } catch { /* best effort - local state already updated */ }
  }

  async function disableTrackSides(exerciseName) {
    const key = exerciseName.trim().toLowerCase()
    setTargets((t) => ({ ...t, [key]: { ...t[key], trackSides: false } }))
    // sidesActive also turns on from any set already carrying a side
    // value, so switching the flag off alone wouldn't visibly do
    // anything until those are cleared too.
    setExercises((list) =>
      list.map((ex) =>
        ex.name.trim().toLowerCase() === key
          ? { ...ex, sets: ex.sets.map((s) => ({ ...s, side: null })) }
          : ex
      )
    )
    touch()
    try {
      await setTrackSides(user.id, exerciseName.trim(), false)
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
    clearDraft()
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
    // Read from this render's current state (not the updater callback)
    // to detect "just became fully filled in" reliably, without relying
    // on setState-updater timing.
    const curEx = exercises.find((e) => e.k === exK)
    const curSet = curEx?.sets.find((s) => s.k === setK)
    const wasComplete = Boolean(curSet && curSet.weight !== '' && curSet.reps !== '')
    const nextWeight = patch.weight !== undefined ? patch.weight : curSet?.weight
    const nextReps = patch.reps !== undefined ? patch.reps : curSet?.reps
    const nowComplete = nextWeight !== '' && nextWeight != null && nextReps !== '' && nextReps != null

    setExercises((list) =>
      list.map((ex) =>
        ex.k === exK
          ? { ...ex, sets: ex.sets.map((s) => (s.k === setK ? { ...s, ...patch } : s)) }
          : ex
      )
    )

    if (!wasComplete && nowComplete) startRestFollowing(exK, setK)
  }

  const oppositeSide = (s) => (s === 'L' ? 'R' : s === 'R' ? 'L' : null)

  function addSet(exK) {
    touch()
    // Tapping "+ Set" is the real "I just finished that set" signal for
    // any set that arrived pre-filled (copied from the last one, or from
    // history) rather than hand-typed - those never pass through
    // updateSet's blank-to-filled detection, so without this they'd
    // never get timed at all. Only fires if nothing's already timing
    // that set (avoids double-triggering when it WAS hand-typed and
    // already started a timer of its own).
    const curEx = exercises.find((e) => e.k === exK)
    const curLast = curEx?.sets[curEx.sets.length - 1]
    const curLastComplete = Boolean(curLast && curLast.weight !== '' && curLast.reps !== '')
    const shouldStartRest = curLastComplete && !rest && curLast.restActual == null

    setExercises((list) =>
      list.map((ex) => {
        if (ex.k !== exK) return ex
        const last = ex.sets[ex.sets.length - 1]
        const hist = ex.name.trim() ? lastSessionFor(workouts, ex.name, workout?.id) : null
        const histNext = hist?.sets?.[ex.sets.length]
        let newSet
        if (histNext) {
          newSet = historySet(histNext)
        } else {
          newSet = last
            ? { k: nextKey(), weight: last.weight, unit: last.unit, reps: last.reps, perSide: last.perSide, side: last.side, feel: '', restTarget: null, restActual: null }
            : blankSet(defaultUnit)
        }
        // Alternating takes priority over whatever history/copy suggested -
        // this is about today's actual left-right rhythm, not the past.
        if (last?.side) newSet = { ...newSet, side: oppositeSide(last.side) }
        return { ...ex, sets: [...ex.sets, newSet] }
      })
    )

    if (shouldStartRest) startRestFollowing(exK, curLast.k)
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

  function toggleCollapsed(exK) {
    setExercises((list) => list.map((ex) => (ex.k === exK ? { ...ex, collapsed: !ex.collapsed } : ex)))
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
    if (dirtyRef.current) clearDraft() // keep an un-resumed draft recoverable
    onClose()
  }

  async function removeWholeWorkout() {
    if (!window.confirm('Delete this whole workout? This cannot be undone.')) return
    setSaving(true)
    try {
      await deleteWorkout(workout.id)
      clearDraft()
      onSaved()
    } catch (e) {
      setError(e.message || 'Could not delete. Check your connection and try again.')
      setSaving(false)
    }
  }

  async function save() {
    setError('')

    // If a rest timer is still running at Finish time, its actual
    // elapsed duration needs to land in THIS payload directly - going
    // through finalizeRest's setExercises first wouldn't be reflected
    // in `exercises` until next render, which is too late for the
    // payload we're about to build right now.
    const pendingRest = rest
      ? { exK: rest.exK, setK: rest.setK, restTarget: rest.targetSeconds, restActual: Math.max(0, Math.round((Date.now() - rest.startedAt) / 1000)) }
      : null

    const payload = exercises
      .map((ex) => ({
        name: ex.name.trim(),
        notes: ex.notes.trim() || null,
        sets: ex.sets
          .filter((s) => s.weight !== '' || s.reps !== '')
          .map((s) => {
            const w = s.weight === '' ? null : parseFloat(s.weight)
            const r = s.reps === '' ? null : parseInt(s.reps, 10)
            const isPending = pendingRest && ex.k === pendingRest.exK && s.k === pendingRest.setK
            return {
              weight: Number.isFinite(w) ? w : null,
              unit: s.unit,
              reps: Number.isFinite(r) ? r : null,
              perSide: s.perSide,
              side: s.side || null,
              feel: s.feel.trim() || null,
              restTarget: isPending ? pendingRest.restTarget : (s.restTarget ?? null),
              restActual: isPending ? pendingRest.restActual : (s.restActual ?? null),
            }
          }),
      }))
      .filter((ex) => ex.name && ex.sets.length)

    if (!payload.length) { setError('Add at least one exercise with a set.'); return }

    setSaving(true)
    try {
      const finishedAt = new Date().toISOString()
      const body = { date, split: workout?.split ?? null, notes: notes.trim() || null, exercises: payload, startedAt, finishedAt }
      if (workout) await updateFullWorkout(user.id, workout.id, body)
      else await insertFullWorkout(user.id, body)
      if (rest) setRest(null)
      clearDraft()
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
          {saving ? 'Finishing…' : 'Finish'}
        </button>
      </div>

      {rest && (
        <div className={`rest-bar ${restRemainingSeconds <= 0 ? 'rest-bar-done' : ''}`}>
          <div className="rest-bar-time">
            {restRemainingSeconds > 0 ? formatMMSS(restRemainingSeconds) : `+${formatMMSS(Math.abs(restRemainingSeconds))}`}
          </div>
          <div className="rest-bar-label">{restRemainingSeconds > 0 ? 'Resting' : 'Rest complete'}</div>
          <div className="rest-bar-actions">
            <button className="mini-btn" onClick={() => adjustRest(-15)} aria-label="15 seconds less">-15s</button>
            <button className="mini-btn" onClick={() => adjustRest(15)} aria-label="15 seconds more">+15s</button>
            <button className="btn rest-bar-skip" onClick={finalizeRest}>Skip</button>
          </div>
        </div>
      )}

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
        const avgReps = ex.name.trim() ? averageRepsEver(workouts, ex.name, workout?.id) : null
        const avgWeight = ex.name.trim() ? averageWeightEver(workouts, ex.name, workout?.id) : null
        const targetInfo = targets[ex.name.trim().toLowerCase()] || null
        // Sides tracking is only ever on because the user deliberately
        // turned it on for this exercise (persisted trackSides flag) -
        // never inferred from a stray leftover `side` value carried in
        // from an old historical set. That fallback used to exist as a
        // safety net for a failed/stale fetch, but it meant testing the
        // feature once on an exercise made it silently reappear "on" in
        // every future session for that exercise, unasked.
        const sidesActive = Boolean(targetInfo?.trackSides)
        const targetReps = targetInfo?.reps || null
        const targetWeightRef = lastSession?.sets?.length
          ? lastSession.sets.reduce((max, s) => (s.weight != null && (!max || toKg(s.weight, s.unit) > toKg(max.weight, max.unit)) ? s : max), null)
          : (targetInfo?.seedWeight != null ? { weight: targetInfo.seedWeight, unit: targetInfo.seedWeightUnit || 'kg' } : null)
        const readyToProgress = hitTargetLastTime(lastSession, targetReps)
        const validSets = ex.sets.filter((st) => st.weight !== '' && st.reps !== '')
        const summaryBest = validSets.length
          ? validSets.reduce((best, st) => (Number(st.weight) > Number(best.weight) ? st : best), validSets[0])
          : null
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
            {!ex.collapsed && ex.sets.some((s) => s.weight !== '' && s.reps !== '') && (
              <button className="mini-btn done-btn" onClick={() => toggleCollapsed(ex.k)} title="Done with this exercise">
                ✓ Done
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => removeExercise(ex.k)} aria-label="Remove exercise">✕</button>
          </div>

          {(ex.notes || ex.notesOpen) ? (
            <textarea
              className="input exercise-note"
              placeholder="Note for this exercise (e.g. a twinge, a form cue, equipment used)"
              value={ex.notes}
              onChange={(e) => updateExercise(ex.k, { notes: e.target.value })}
              rows={2}
              name={`exercise-note-${sessionSalt}-${ex.k}`}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          ) : (
            <button className="exercise-note-toggle" onClick={() => updateExercise(ex.k, { notesOpen: true })}>
              + Note for this exercise
            </button>
          )}

          {ex.collapsed ? (
            <button className="exercise-summary" onClick={() => toggleCollapsed(ex.k)}>
              <span className="small">
                {validSets.length} set{validSets.length === 1 ? '' : 's'}
                {summaryBest ? ` · best ${summaryBest.weight}${summaryBest.unit === 'lbs' ? 'lb' : 'kg'}×${summaryBest.reps}` : ''}
              </span>
              <span className="small" style={{ color: 'var(--yellow)' }}>Edit</span>
            </button>
          ) : (
          <>
          {pickerFor === ex.k && (
            <ExercisePicker
              recentNames={exerciseNames}
              onSelect={(name) => updateExercise(ex.k, { name })}
              onClose={() => setPickerFor(null)}
            />
          )}

          {readyToProgress && (
            <div className="progress-notice">
              🎯 You hit {targetReps} reps at every weight (up to {targetWeightRef ? `${targetWeightRef.weight}${targetWeightRef.unit === 'lbs' ? 'lb' : 'kg'}` : 'your top set'}) last time — probably time to add weight (double progression).
            </div>
          )}

          {(bestSet || ex.name.trim()) && (
          <div className="last-time-row">
            <div className="ref-lines">
              {bestSet ? (
                <span className="small">
                  🏆 Best: <strong style={{ color: 'var(--ink)' }}>{bestSet.weight}{bestSet.unit === 'lbs' ? 'lb' : 'kg'}×{bestSet.reps}{bestSet.perSide ? '/side' : ''}</strong>
                  {avgReps != null && <> · avg {avgWeight}kg×{avgReps} reps</>}
                </span>
              ) : <span className="small">No history for this exercise yet</span>}
              {lastSession && (
                <span className="small">
                  Last time: {lastSession.sets.map((s, idx) => (
                    <span key={idx}>{idx > 0 ? ', ' : ''}{s.weight ?? '–'}{s.unit === 'lbs' ? 'lb' : 'kg'}×{s.reps ?? '–'}</span>
                  ))}
                </span>
              )}
            </div>
            <div className="chip-stack">
              {targetReps ? (
                <button className="target-chip" onClick={() => {
                  const v = window.prompt('Target reps for this exercise', String(targetReps))
                  const n = parseInt(v, 10)
                  if (Number.isFinite(n) && n > 0) setTargetFor(ex.name, n, targetInfo?.seedWeight ?? null, targetInfo?.seedWeightUnit ?? null)
                }}>
                  🎯 {targetReps} reps{targetWeightRef ? ` @ ${targetWeightRef.weight}${targetWeightRef.unit === 'lbs' ? 'lb' : 'kg'}` : ''}
                </button>
              ) : (
                <button className="target-chip target-chip-empty" onClick={() => {
                  const v = window.prompt(`Set a rep target for ${ex.name.trim()}? (e.g. 15)`)
                  const n = parseInt(v, 10)
                  if (!Number.isFinite(n) || n <= 0) return
                  if (!lastSession) {
                    const w = window.prompt(`What weight are you starting this at? (optional — leave blank to skip)`)
                    const wNum = parseFloat(w)
                    setTargetFor(ex.name, n, Number.isFinite(wNum) && wNum > 0 ? wNum : null, defaultUnit)
                  } else {
                    setTargetFor(ex.name, n)
                  }
                }}>
                  + Set target
                </button>
              )}
              <button
                className={`target-chip ${sidesActive ? '' : 'target-chip-empty'}`}
                onClick={() => (sidesActive ? disableTrackSides(ex.name) : maybeExplainThenEnableSides(ex.name))}
              >
                {sidesActive ? '✓ Tracking left/right' : 'Track left/right'}
              </button>
            </div>
          </div>
          )}

          {ex.sets.map((s, i) => {
            const customFeel = s.feel && !FEEL_VALUES.includes(s.feel)
            return (
              <div key={s.k}>
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
                  {sidesActive ? (
                    <button
                      className={`mini-btn side-btn on ${s.side === 'R' ? 'side-r' : 'side-l'}`}
                      onClick={() => updateSet(ex.k, s.k, { side: s.side === 'R' ? 'L' : 'R' })}
                      aria-label={`Side: ${s.side === 'R' ? 'right' : 'left'} — tap to switch`}
                    >
                      {s.side === 'R' ? 'R' : 'L'}
                    </button>
                  ) : (
                    <span className="side-slot-spacer" aria-hidden="true" />
                  )}
                  <button className="remove-set" onClick={() => removeSet(ex.k, s.k)} aria-label={`Remove set ${i + 1}`}>✕</button>
                </div>
                <div className="set-feel-label">How did it feel?</div>
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
                        aria-label={f.value}
                        title={f.value}
                      >
                        <span className="feel-num">{f.num}</span>{f.emoji}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )
          })}

          <button className="btn btn-block" onClick={() => addSet(ex.k)}>+ Set</button>
          </>
          )}
        </div>
        )
      })}
      </div>

      <button className="btn btn-block" onClick={addExercise}>+ Exercise</button>

      <div className="field" style={{ marginTop: 14 }}>
        <label className="label" htmlFor="w-notes">Overall Session notes</label>
        <textarea
          id="w-notes"
          className="textarea"
          placeholder="Cardio, aches, anything worth remembering"
          value={notes}
          onChange={(e) => { touch(); setNotes(e.target.value) }}
          name={`session-notes-${sessionSalt}`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
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
          {saving ? 'Finishing…' : 'Finish workout'}
        </button>
      </div>
    </div>
  )
}
