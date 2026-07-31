import { useEffect, useMemo, useRef, useState } from 'react'
import { insertFullWorkout, updateFullWorkout, deleteWorkout, fetchExerciseTargets, saveExerciseTarget, setTrackSides, setPerSide } from '../lib/db'
import { todayISO, toKg } from '../lib/format'
import { pictogramFor, exactPictogramFor, groupFor, GROUP_COLOR, searchExercises } from '../lib/exerciseLibrary'
import { PICTOGRAMS } from '../lib/pictograms'
import { lastSessionFor, bestSetEver, averageRepsEver, averageWeightEver, hitTargetLastTime } from '../lib/setComparison'
import { peekDraft, clearDraft, DRAFT_KEY } from '../lib/draft'

// Simple, scalable clock glyph for the Workout Duration card - clean line
// icon rather than an emoji, so it renders consistently across devices
// and can pick up the theme color via currentColor.
function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}

// For the live session clock - switches to h:mm:ss once past an hour,
// mm:ss below that, so it never shows a redundant leading "0:".
function formatSessionClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
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
const PER_SIDE_INTRO_KEY = 'countit_per_side_intro_seen_v1'

let seq = 0
const nextKey = () => `k${++seq}`

// Sets pre-filled from history behave exactly like any other set - no
// separate "confirm" step, matching how Strong/Hevy handle this: the
// pre-filled number IS the value, Save is the only confirmation needed.
const blankSet = (unit) => ({ k: nextKey(), weight: '', unit, reps: '', perSide: false, side: null, feel: '', warmup: false })
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
    warmup: Boolean(histSet.warmup),
  }
}

// db workout -> editable model
function toModel(workout) {
  return workout.exercises.map((ex) => ({
    k: nextKey(),
    name: ex.name,
    // "collapsed" was never persisted - it's a live-session UI concept
    // only. Reopening an already-saved workout means every exercise
    // here is, by definition, already logged - start them collapsed so
    // it reads as a review, not an open invitation to re-edit. Only a
    // genuinely NEW exercise added via "+Exercise" during this edit
    // (blankExercise, elsewhere) starts open.
    collapsed: true,
    notes: ex.notes || '',
    sets: ex.sets.map((s) => ({
      k: nextKey(),
      weight: s.weight ?? '',
      unit: s.unit,
      reps: s.reps ?? '',
      perSide: Boolean(s.per_side),
      side: s.side || null,
      feel: s.feel || '',
      warmup: Boolean(s.warmup),
    })),
  }))
}

function readDraft(target) {
  const d = peekDraft()
  return d && d.target === target ? d : null
}

export default function WorkoutEditor({ user, workout, workouts, exerciseNames, defaultUnit, autoResumeDraft, onClose, onSaved }) {
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
  // For a genuinely new session, this is the real moment it began -
  // simple, exactly one clock, starts now and ends at Finish. For an
  // existing workout, only use its real recorded value - never invent
  // a fresh "right now" timestamp just because the workout is being
  // opened, or every old workout would falsely look like it took ~0
  // minutes the instant you edited anything else on it.
  const [startedAt, setStartedAt] = useState(() => (workout ? (workout.started_at ?? null) : new Date().toISOString()))
  // Workout Duration, edited as a simple hour:minute clock picker rather
  // than a bare number - "1:30" reads instantly, "90" makes you do math.
  // Only ever shown for an already-saved workout being reopened.
  const [durationHHMM, setDurationHHMM] = useState(() => {
    if (!workout?.started_at || !workout?.finished_at) return '00:00'
    const mins = Math.max(0, Math.round((new Date(workout.finished_at) - new Date(workout.started_at)) / 60000))
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
  })
  // Tracks whether he actually touched the picker this session - if he
  // didn't, the original finished_at is preserved exactly as-is rather
  // than being recomputed from an untouched default value.
  const [durationTouched, setDurationTouched] = useState(false)
  // Rest-time tracking removed entirely per his explicit request - no
  // background timestamping, no data collection, nothing. Just the
  // Workout Duration field and the live session clock remain.
  const [, forceTick] = useState(0)
  // Flips true the first time genuinely new activity (a freshly typed
  // set, a freshly added exercise) is detected during THIS edit session -
  // that's what makes the session clock reappear, without it also
  // reappearing just because an old workout was opened to fix a typo.
  const [liveActivityDetected, setLiveActivityDetected] = useState(!workout)
  // What the workout's duration already was BEFORE this edit session
  // reopened it - captured once at mount, from its real recorded
  // timestamps. This is the anchor the live clock resumes from.
  const [priorDurationSeconds] = useState(() => {
    if (!workout?.started_at || !workout?.finished_at) return 0
    const secs = Math.round((new Date(workout.finished_at) - new Date(workout.started_at)) / 1000)
    return Number.isFinite(secs) && secs >= 0 ? secs : 0
  })
  // The clock's anchor is a VIRTUAL start time, not the real one - "now
  // minus whatever duration was already recorded" - so it continues
  // ticking up from exactly where it left off (e.g. 3:00) rather than
  // counting the real gap since the original session (e.g. 47 minutes
  // if he stepped away and came back). A break should never silently
  // become part of the workout duration.
  const [clockAnchorMs, setClockAnchorMs] = useState(() => (workout ? null : new Date(startedAt).getTime()))
  const [resumedClockAnchorMs, setResumedClockAnchorMs] = useState(null)
  const effectiveClockAnchorMs = clockAnchorMs ?? resumedClockAnchorMs

  const sessionClockVisible = liveActivityDetected && effectiveClockAnchorMs != null

  // Live session clock - ticks continuously once visible.
  useEffect(() => {
    if (!sessionClockVisible) return
    const id = setInterval(() => forceTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [sessionClockVisible])

  const sessionElapsedSeconds = sessionClockVisible ? Math.floor((Date.now() - effectiveClockAnchorMs) / 1000) : 0

  // Called the moment genuinely new activity is detected during an edit
  // session - flips the clock on, anchored to skip the gap since the
  // workout was originally finished.
  function markLiveActivity() {
    if (liveActivityDetected) return
    setLiveActivityDetected(true)
    setResumedClockAnchorMs(Date.now() - priorDurationSeconds * 1000)
  }

  const [notes, setNotes] = useState(workout?.notes ?? '')
  const [exercises, setExercises] = useState(() => (workout ? toModel(workout) : [blankExercise(defaultUnit)]))
  // Snapshot of every set-key that existed the moment this editor opened
  // - only meaningful when editing an already-saved workout. Lets us
  // tell "genuinely new activity added during this edit" (a fresh
  // exercise, a fresh set) apart from old pre-existing data that just
  // happens to look complete. A key not in this set is unambiguously
  // something typed or added just now, regardless of whether this is a
  // brand-new session or an edit of an old one.
  const [preExistingSetKeys] = useState(() => {
    if (!workout) return null
    const keys = new Set()
    for (const ex of exercises) for (const s of ex.sets) keys.add(s.k)
    return keys
  })
  const [draft, setDraft] = useState(() => readDraft(target))
  // He already decided to resume once, from the dashboard-level confirm
  // or banner - asking again in here, with its own separate Resume
  // button, would just be making him confirm the same decision twice.
  // Runs once, right after mount, only when there's actually a draft
  // AND the dashboard explicitly signaled this was a confirmed resume.
  const autoResumedRef = useRef(false)
  useEffect(() => {
    if (autoResumeDraft && draft && !autoResumedRef.current) {
      autoResumedRef.current = true
      resumeDraft()
    }
  }, [autoResumeDraft, draft])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Which exercise's name field currently has a live-suggestions
  // dropdown open beneath it - only ever one at a time.
  const [suggestFor, setSuggestFor] = useState(null)
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
    // Mutually exclusive with Per Side for the same exercise -
    // alternating single-arm sets and both-hands-at-once sets can't
    // both be true for the same exercise at the same time.
    if (targets[key]?.perSide) {
      await disablePerSide(exerciseName)
    }
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

  function maybeExplainThenEnablePerSide(exerciseName) {
    try {
      if (!localStorage.getItem(PER_SIDE_INTRO_KEY)) {
        window.alert(
          'Mark this exercise "Per side weight" when you hold weight in BOTH hands at once (e.g. dumbbell bench press).\n\n' +
          'The number you log is treated as what\'s in each hand - total volume is doubled automatically.\n\n' +
          'This is different from Track left/right, which is for alternating single-arm sets - turning one on turns the other off for this exercise.'
        )
        localStorage.setItem(PER_SIDE_INTRO_KEY, '1')
      }
    } catch { /* localStorage unavailable - skip the one-time explainer, not critical */ }
    enablePerSide(exerciseName)
  }

  async function enablePerSide(exerciseName) {
    const key = exerciseName.trim().toLowerCase()
    // Mutually exclusive with Track Sides for the same exercise - see
    // the note in enableTrackSides above.
    if (targets[key]?.trackSides) {
      await disableTrackSides(exerciseName)
    }
    setTargets((t) => ({ ...t, [key]: { ...t[key], perSide: true } }))
    // Every existing set in this exercise is retroactively per-side too
    // - matches how enableTrackSides seeds all existing sets, not just
    // new ones going forward.
    setExercises((list) =>
      list.map((ex) =>
        ex.name.trim().toLowerCase() === key
          ? { ...ex, sets: ex.sets.map((s) => ({ ...s, perSide: true })) }
          : ex
      )
    )
    touch()
    try {
      await setPerSide(user.id, exerciseName.trim(), true)
    } catch { /* best effort - local state already updated */ }
  }

  async function disablePerSide(exerciseName) {
    const key = exerciseName.trim().toLowerCase()
    setTargets((t) => ({ ...t, [key]: { ...t[key], perSide: false } }))
    setExercises((list) =>
      list.map((ex) =>
        ex.name.trim().toLowerCase() === key
          ? { ...ex, sets: ex.sets.map((s) => ({ ...s, perSide: false })) }
          : ex
      )
    )
    touch()
    try {
      await setPerSide(user.id, exerciseName.trim(), false)
    } catch { /* best effort - local state already updated */ }
  }
  const dirtyRef = useRef(false)
  const touch = () => { dirtyRef.current = true }


  // autosave a local draft so a mid-session reload never loses sets
  useEffect(() => {
    if (!dirtyRef.current) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ target, date, notes, exercises, startedAt, ts: Date.now() }))
      } catch { /* storage full - draft is best effort */ }
    }, 350)
    return () => clearTimeout(t)
  }, [target, date, notes, exercises])

  function resumeDraft() {
    setDate(draft.date)
    setNotes(draft.notes)
    setExercises(draft.exercises.map((ex) => ({ ...ex, k: nextKey(), sets: ex.sets.map((s) => ({ ...s, k: nextKey() })) })))
    // The clock previously had no way to reflect a resumed session's
    // real start time - it was locked in at page-load the instant this
    // component mounted, before Resume was ever tapped. Restoring both
    // together is what actually fixes the "starts from 0" bug, not just
    // bringing the sets back.
    if (draft.startedAt) {
      setStartedAt(draft.startedAt)
      setClockAnchorMs(new Date(draft.startedAt).getTime())
    }
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

    if (!wasComplete && nowComplete && (!workout || !preExistingSetKeys.has(setK))) {
      markLiveActivity()
    }
  }

  function toggleWarmup(exK, setK, currentWarmup) {
    updateSet(exK, setK, { warmup: !currentWarmup })
  }

  const oppositeSide = (s) => (s === 'L' ? 'R' : s === 'R' ? 'L' : null)

  function addSet(exK) {
    touch()
    markLiveActivity()
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
            ? { k: nextKey(), weight: last.weight, unit: last.unit, reps: last.reps, perSide: last.perSide, side: last.side, feel: '', warmup: false }
            : blankSet(defaultUnit)
        }
        // Alternating takes priority over whatever history/copy suggested -
        // this is about today's actual left-right rhythm, not the past.
        if (last?.side) newSet = { ...newSet, side: oppositeSide(last.side) }
        return { ...ex, sets: [...ex.sets, newSet] }
      })
    )
  }

  function removeSet(exK, setK) {
    touch()
    setExercises((list) => list.map((ex) => (ex.k === exK ? { ...ex, sets: ex.sets.filter((s) => s.k !== setK) } : ex)))
  }

  function addExercise() {
    touch()
    markLiveActivity()
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

    const payload = exercises
      .map((ex) => ({
        name: ex.name.trim(),
        notes: ex.notes.trim() || null,
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
              side: s.side || null,
              feel: s.feel.trim() || null,
              warmup: Boolean(s.warmup),
            }
          }),
      }))
      .filter((ex) => ex.name && ex.sets.length)

    if (!payload.length) { setError('Add at least one exercise with a set.'); return }

    setSaving(true)
    try {
      // Three cases: (1) a genuinely new session - simple, real "now" at
      // Finish, exactly one clock start-to-end. (2) an existing workout
      // where he touched the duration picker - honor that number
      // directly, anchored to its real started_at if it has one, or to
      // midnight of its date if it never had timing data at all (never
      // pair a fabricated "now" with a real old date). (3) an existing
      // workout he didn't touch the duration on - preserve its original
      // timing exactly, untouched, no matter what else he edited.
      let startedAtToSave = startedAt
      let finishedAtToSave
      if (!workout) {
        finishedAtToSave = new Date().toISOString()
      } else if (durationTouched) {
        const [hh, mm] = durationHHMM.split(':').map(Number)
        const durationMs = ((hh || 0) * 60 + (mm || 0)) * 60000
        const anchorMs = startedAt ? new Date(startedAt).getTime() : new Date(`${date}T00:00:00`).getTime()
        if (!startedAt) startedAtToSave = new Date(anchorMs).toISOString()
        finishedAtToSave = new Date(anchorMs + durationMs).toISOString()
      } else {
        finishedAtToSave = workout.finished_at ?? null
      }
      const body = { date, split: workout?.split ?? null, notes: notes.trim() || null, exercises: payload, startedAt: startedAtToSave, finishedAt: finishedAtToSave }
      if (workout) await updateFullWorkout(user.id, workout.id, body)
      else await insertFullWorkout(user.id, body)
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

      {(sessionClockVisible || workout) && (
        <div className={`workout-time-card ${sessionClockVisible ? 'workout-time-live' : ''}`}>
          <ClockIcon className="workout-time-icon" />
          <div className="workout-time-body">
            <div className="workout-time-label">
              {sessionClockVisible && <span className="workout-time-dot" aria-hidden="true" />}
              Workout Duration
            </div>
            {sessionClockVisible ? (
              <div className="workout-time-value">{formatSessionClock(sessionElapsedSeconds)}</div>
            ) : (
              <>
                <input
                  id="w-duration"
                  className="input workout-time-input"
                  type="time"
                  value={durationHHMM}
                  onChange={(e) => { touch(); setDurationTouched(true); setDurationHHMM(e.target.value) }}
                />
                <div className="field-hint">Forgot to hit Finish on time? Correct it here.</div>
              </>
            )}
          </div>
        </div>
      )}

      {draft && !autoResumeDraft && (
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
        // Collapsed exercises are already-saved, done data - there's no
        // "is this confirmed yet" ambiguity, so the loose keyword-based
        // lookup is correct here (handles minor real-world variations
        // like "Lateral Raise (Machine)" that don't exactly match the
        // canonical library string). The live-editing header uses the
        // strict exact-only version instead, since THAT'S the one where
        // showing an icon prematurely (before a real selection) is
        // actually misleading.
        const CollapsedPic = PICTOGRAMS[pictogramFor(ex.name)]
        const ExPic = PICTOGRAMS[exactPictogramFor(ex.name)]
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
        const perSideActive = Boolean(targetInfo?.perSide)
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
        <div className={`exercise-block ${ex.collapsed ? 'exercise-block-collapsed' : ''}`} key={ex.k}>
          {ex.collapsed ? (
            <div className="exercise-collapsed-row">
              {CollapsedPic && (
                <span className="exercise-thumb exercise-thumb-sm" style={{ background: exColor + '26' }}>
                  <CollapsedPic width="20" height="20" />
                </span>
              )}
              <span className="exercise-collapsed-text">
                <span className="exercise-collapsed-name">{ex.name || `Exercise ${exIdx + 1}`}</span>
                <span className="exercise-collapsed-meta">
                  {validSets.length} set{validSets.length === 1 ? '' : 's'}
                  {summaryBest ? ` · best ${summaryBest.weight}${summaryBest.unit === 'lbs' ? 'lb' : 'kg'}×${summaryBest.reps}` : ''}
                </span>
              </span>
              <span className="exercise-done-badge" aria-label="Marked done" title="Done">✓</span>
              <button className="exercise-edit-hint" onClick={() => toggleCollapsed(ex.k)}>Edit</button>
            </div>
          ) : (
            <>
            <div className="exercise-head">
              {ExPic && (
                <span className="exercise-thumb" style={{ background: exColor + '26' }}>
                  <ExPic width="30" height="30" />
                </span>
              )}
              <div className="name-input-wrap">
                <svg className="name-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5" /><line x1="20" y1="20" x2="15.5" y2="15.5" />
                </svg>
                <input
                  className="input name-input"
                  placeholder="Search or type exercise"
                  value={ex.name}
                  onChange={(e) => { updateExercise(ex.k, { name: e.target.value }); setSuggestFor(ex.k) }}
                  onBlur={() => setTimeout(() => setSuggestFor((cur) => (cur === ex.k ? null : cur)), 150)}
                />
              </div>
              {ex.sets.some((s) => s.weight !== '' && s.reps !== '') && (
                <button className="mini-btn done-btn" onClick={() => toggleCollapsed(ex.k)} title="Done with this exercise">
                  ✓ Done
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => removeExercise(ex.k)} aria-label="Remove exercise">✕</button>
            </div>

            {suggestFor === ex.k && ex.name.trim() && (() => {
              const results = searchExercises(ex.name.trim()).slice(0, 6)
              const exact = results.some((r) => r.name.toLowerCase() === ex.name.trim().toLowerCase())
              if (results.length === 0) return null
              return (
                <div className="name-suggestions">
                  {results.map((r) => {
                    const RPic = PICTOGRAMS[r.pictogram]
                    const rColor = GROUP_COLOR[r.group] || GROUP_COLOR.Other
                    return (
                    <button
                      key={r.name}
                      className="name-suggestion-row"
                      // onMouseDown fires before the input's onBlur, so
                      // the click registers before the dropdown closes -
                      // onClick alone would lose the tap to the blur.
                      onMouseDown={(e) => { e.preventDefault(); updateExercise(ex.k, { name: r.name }); setSuggestFor(null) }}
                    >
                      {RPic ? (
                        <span className="name-suggestion-icon" style={{ background: rColor + '26' }}>
                          <RPic width="18" height="18" />
                        </span>
                      ) : (
                        <span className="name-suggestion-icon name-suggestion-icon-dot" style={{ background: rColor }} />
                      )}
                      <span className="name-suggestion-text">{r.name}</span>
                      {exact && r.name.toLowerCase() === ex.name.trim().toLowerCase() && (
                        <span className="name-suggestion-exact">exact match</span>
                      )}
                    </button>
                    )
                  })}
                </div>
              )
            })()}

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
              <button
                className={`target-chip ${perSideActive ? '' : 'target-chip-empty'}`}
                onClick={() => (perSideActive ? disablePerSide(ex.name) : maybeExplainThenEnablePerSide(ex.name))}
              >
                {perSideActive ? '✓ Per side weight' : 'Per side weight'}
              </button>
            </div>
            {perSideActive && (
              <div className="field-hint" style={{ marginTop: -4, marginBottom: 8 }}>
                Weight logged is per hand — volume is doubled automatically.
              </div>
            )}
          </div>
          )}

          {ex.sets.map((s, i) => {
            const customFeel = s.feel && !FEEL_VALUES.includes(s.feel)
            return (
              <div key={s.k}>
                <button
                  className={`chip warmup-chip ${s.warmup ? 'on' : ''}`}
                  onClick={() => toggleWarmup(ex.k, s.k, s.warmup)}
                >
                  {s.warmup ? '✓ Warm-up set' : 'Warm-up set?'}
                </button>
                <div className="set-row">
                  <span className={`set-index ${s.warmup ? 'set-index-warmup' : ''}`}>
                    {s.warmup ? `W${i + 1}` : i + 1}
                  </span>
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
