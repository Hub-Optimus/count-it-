import { useEffect, useMemo, useState } from 'react'
import {
  BEGINNER_STAGES, STAGE_EXIT_DAYS, GRADUATION_MIN_WEEKS,
  nextStage, distinctLoggedDays, weeksSince, isReadyToGraduate, stage1Prescription,
} from '../lib/roadmap'
import { advanceRoadmapStage, markRoadmapGraduated, insertFullWorkout } from '../lib/db'
import { pictogramFor, groupFor, GROUP_COLOR } from '../lib/exerciseLibrary'
import { PICTOGRAMS } from '../lib/pictograms'
import { todayISO } from '../lib/format'
import { Tally } from './TabBar'

// Reuses the app's real pictogram set (same one ExercisePicker uses) so
// Stage 1 gets themed icons for free instead of a plain text list.
function ExerciseIcon({ name }) {
  const cat = pictogramFor(name)
  const Pic = cat && PICTOGRAMS[cat]
  if (!Pic) return null
  const group = groupFor(name) || 'Other'
  const color = GROUP_COLOR[group] || GROUP_COLOR.Other
  return (
    <span className="picker-row-picto" style={{ background: color + '26', color }}>
      <Pic width="26" height="26" />
    </span>
  )
}

// Inline quick-log: weight required (can't fake it - it'd corrupt real
// workout history and every chart built on it), reps pre-filled with a
// sensible default but editable, one tap to check off. No navigation,
// no superset/warmup/RPE/timer chrome from the full editor - that's
// still there via the full logger if someone wants it, this just isn't
// the default path for Stage 1 anymore.
function QuickLogSession({ user, exercises, defaultUnit, onLogged }) {
  const [drafts, setDrafts] = useState({}) // name -> { weight, reps }
  const [logged, setLogged] = useState({}) // name -> { weight, reps }
  const [saving, setSaving] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  const loggedCount = Object.keys(logged).length
  const unit = defaultUnit || 'kg'

  function checkOff(ex) {
    const draft = drafts[ex.name] || {}
    const weight = parseFloat(draft.weight)
    const reps = parseInt(draft.reps ?? ex.defaultReps, 10)
    if (!weight || weight <= 0 || !reps || reps <= 0) return
    setLogged((l) => ({ ...l, [ex.name]: { weight, reps } }))
  }

  function undo(name) {
    setLogged((l) => {
      const next = { ...l }
      delete next[name]
      return next
    })
  }

  async function finishSession() {
    const names = Object.keys(logged)
    if (!names.length) return
    setSaving(true)
    try {
      const exercisesPayload = names.map((name) => ({
        name,
        notes: null,
        sets: [{ weight: logged[name].weight, unit, reps: logged[name].reps, warmup: false }],
      }))
      await insertFullWorkout(user.id, { date: todayISO(), split: null, notes: null, exercises: exercisesPayload })
      const allDone = names.length === exercises.length
      setLogged({})
      setDrafts({})
      if (allDone) {
        setCelebrate(true)
        setTimeout(() => setCelebrate(false), 2200)
      }
      onLogged?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="hr" />
      {loggedCount > 0 && (
        <span className="roadmap-session-counter">{loggedCount} of {exercises.length} logged</span>
      )}
      <p className="small" style={{ margin: '0 0 4px' }}>
        Today's session — same movements every time this stage, type your weight and check it off:
      </p>
      {exercises.map((ex) => {
        const done = logged[ex.name]
        const draft = drafts[ex.name] || {}
        return (
          <div className="quick-log-row" key={ex.name}>
            <ExerciseIcon name={ex.name} />
            <div className="quick-log-info">
              <div className="quick-log-name">{ex.name}</div>
              {done
                ? <div className="quick-log-done-text">{done.weight}{unit} × {done.reps}</div>
                : <div className="quick-log-target">{ex.target}</div>}
            </div>
            {!done && (
              <>
                <input
                  className="quick-log-input"
                  placeholder={unit}
                  inputMode="decimal"
                  value={draft.weight ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [ex.name]: { ...d[ex.name], weight: e.target.value } }))}
                  aria-label={`${ex.name} weight`}
                />
                <input
                  className="quick-log-input"
                  placeholder="reps"
                  inputMode="numeric"
                  value={draft.reps ?? String(ex.defaultReps)}
                  onChange={(e) => setDrafts((d) => ({ ...d, [ex.name]: { ...d[ex.name], reps: e.target.value } }))}
                  aria-label={`${ex.name} reps`}
                />
              </>
            )}
            <button
              type="button"
              className={`quick-log-check ${done ? 'done' : ''}`}
              onClick={() => (done ? undo(ex.name) : checkOff(ex))}
              aria-label={done ? `Undo ${ex.name}` : `Mark ${ex.name} done`}
            >
              ✓
            </button>
          </div>
        )
      })}
      {celebrate && <p className="roadmap-celebration">🔥 Session logged — nice work!</p>}
      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 10 }}
        disabled={loggedCount === 0 || saving}
        onClick={finishSession}
      >
        {saving ? 'Saving…' : `Finish session${loggedCount ? ` (${loggedCount})` : ''}`}
      </button>
    </>
  )
}

// The gamified overview - "where am I, what's next" - plus, for Stage 1
// specifically, an actual inline quick-log, since that's the only stage
// with real content built yet. Stages 2/3 don't have their own template
// content yet, so they stay overview-only for now - not an oversight,
// just not built.
export default function Roadmap({ user, workouts, profile, defaultUnit, roadmapProgress, onProgressChange, onLogged }) {
  const days = useMemo(() => distinctLoggedDays(workouts), [workouts])
  const stage1Exercises = useMemo(() => stage1Prescription(profile?.goal_priority ?? []), [profile])
  const computedStage = useMemo(
    () => (roadmapProgress ? nextStage(roadmapProgress.stage, workouts) : null),
    [roadmapProgress, workouts],
  )
  const readyToGraduate = useMemo(
    () => isReadyToGraduate(roadmapProgress, workouts),
    [roadmapProgress, workouts],
  )

  // Persist forward movement the moment live data actually earns it -
  // computed on view, same pattern the rest of the app already uses
  // (e.g. compareSet), no background job needed.
  useEffect(() => {
    if (!roadmapProgress || !computedStage) return
    if (computedStage !== roadmapProgress.stage) {
      advanceRoadmapStage(user.id, computedStage)
        .then(() => onProgressChange({ ...roadmapProgress, stage: computedStage }))
        .catch(() => {})
    }
  }, [computedStage, roadmapProgress, user.id, onProgressChange])

  useEffect(() => {
    if (roadmapProgress && readyToGraduate) {
      markRoadmapGraduated(user.id)
        .then(() => onProgressChange({ ...roadmapProgress, graduated_at: new Date().toISOString() }))
        .catch(() => {})
    }
  }, [readyToGraduate, roadmapProgress, user.id, onProgressChange])

  if (!roadmapProgress) {
    return (
      <div className="empty">
        <Tally size={44} />
        <p>No roadmap yet.</p>
      </div>
    )
  }

  if (roadmapProgress.graduated_at) {
    return (
      <div className="card">
        <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>🎉 You've graduated Beginner</p>
        <p className="small" style={{ marginTop: 6 }}>
          Your regularly-trained lifts stopped moving session to session even after enough time to
          settle — that's the real signal you're ready for Intermediate. The Intermediate roadmap
          isn't built yet, so for now just keep logging as normal; we'll let you know the moment it's ready.
        </p>
      </div>
    )
  }

  const stage = roadmapProgress.stage
  const current = BEGINNER_STAGES.find((s) => s.id === stage)

  return (
    <div>
      <div className="card">
        <p className="small" style={{ margin: 0 }}>Stage {stage} of 3</p>
        <p style={{ fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>{current.label}</p>
        <p className="small" style={{ margin: '6px 0 0' }}>{current.blurb}</p>

        {(stage === 1 || stage === 2) && (
          <>
            <div className="roadmap-bar-track">
              <div
                className="roadmap-bar-fill"
                style={{ width: `${Math.min(100, (days / STAGE_EXIT_DAYS[stage]) * 100)}%` }}
              />
            </div>
            <p className="small" style={{ margin: 0 }}>{days} of {STAGE_EXIT_DAYS[stage]} days logged</p>
          </>
        )}

        {stage === 1 && (
          <QuickLogSession user={user} exercises={stage1Exercises} defaultUnit={defaultUnit} onLogged={onLogged} />
        )}

        {stage === 3 && (
          <>
            <div className="roadmap-bar-track">
              <div
                className="roadmap-bar-fill"
                style={{ width: `${Math.min(100, (weeksSince(roadmapProgress.started_at) / GRADUATION_MIN_WEEKS) * 100)}%` }}
              />
            </div>
            <p className="small" style={{ margin: 0 }}>
              {Math.max(0, Math.floor(weeksSince(roadmapProgress.started_at)))} of {GRADUATION_MIN_WEEKS} weeks minimum —
              after that, we watch whether your lifts are still moving.
            </p>
          </>
        )}
      </div>

      <div className="card">
        {BEGINNER_STAGES.map((s) => {
          const status = s.id < stage ? 'done' : s.id === stage ? 'current' : 'locked'
          return (
            <div className={`roadmap-stage ${status}`} key={s.id}>
              <span className="roadmap-stage-marker">{status === 'done' ? '✓' : s.id}</span>
              <div>
                <div className="roadmap-stage-label">{s.label}</div>
                <div className="small">{s.blurb}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
