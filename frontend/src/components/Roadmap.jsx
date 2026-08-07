import { useEffect, useMemo, useState } from 'react'
import {
  BEGINNER_STAGES, STAGE_EXIT_DAYS, GRADUATION_MIN_WEEKS,
  nextStage, distinctLoggedDays, weeksSince, isReadyToGraduate, stage1Prescription,
} from '../lib/roadmap'
import { advanceRoadmapStage, markRoadmapGraduated, insertFullWorkout, debugSetRoadmapProgress } from '../lib/db'
import { pictogramFor, groupFor, GROUP_COLOR } from '../lib/exerciseLibrary'
import { PICTOGRAMS } from '../lib/pictograms'
import { todayISO } from '../lib/format'
import { playCheckSound, playCelebrationSound } from '../lib/sound'
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

// Hand-drawn in the exact same halo-stroke technique as the app's real
// pictogram icons (thick currentColor outline, thinner red pass on top,
// filled torso, ground shadow) so it looks like it belongs here instead
// of a bolted-on mascot in a different visual language.
function Mascot({ celebrating }) {
  const arms = celebrating
    ? { left: 'M16 16 L9 7', right: 'M24 16 L31 7' }
    : { left: 'M16 16 L12 24', right: 'M24 16 L28 24' }
  return (
    <svg viewBox="0 0 40 40" width="64" height="64" className={`roadmap-mascot ${celebrating ? 'celebrating' : 'idle'}`}>
      <ellipse cx="20" cy="37.5" rx="7" ry="1.5" fill="currentColor" opacity="0.14" />
      <g fill="none" stroke="currentColor" strokeWidth="7.2" strokeLinecap="round">
        <line x1="18" y1="25" x2="15" y2="35" />
        <line x1="22" y1="25" x2="25" y2="35" />
        <path d={arms.left} />
        <path d={arms.right} />
      </g>
      <g fill="none" stroke="#EF4444" strokeWidth="5.2" strokeLinecap="round">
        <line x1="18" y1="25" x2="15" y2="35" />
        <line x1="22" y1="25" x2="25" y2="35" />
        <path d={arms.left} />
        <path d={arms.right} />
      </g>
      <path d="M16 14 Q20 12.5 24 14 L24 25 Q20 27 16 25 Z" fill="currentColor" opacity="0.92" />
      <circle cx="20" cy="10" r="4" fill="currentColor" />
    </svg>
  )
}

// Small CSS particle burst - no canvas, no new dependency, just enough
// motion to sell "celebration" without pretending to be a game engine.
function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    id: i,
    color: ['#F5B93B', '#EF4444', '#22C55E', '#3B82F6'][i % 4],
    dx: (Math.random() - 0.5) * 160,
    dy: 50 + Math.random() * 70,
    rot: (Math.random() - 0.5) * 360,
    delay: Math.random() * 0.15,
  })), [])
  return (
    <div className="roadmap-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="roadmap-confetti-piece"
          style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': `${p.rot}deg`, background: p.color, animationDelay: `${p.delay}s` }}
        />
      ))}
    </div>
  )
}

// TEST-ONLY panel, gated to one specific account (checked against
// user.email below) so it can never appear for a real user even by
// accident. Lets that one account jump the roadmap to any state
// instantly instead of waiting on real days/weeks, and undo back to
// day 1 - all through debugSetRoadmapProgress, which only ever touches
// roadmap_progress, never real workout history.
const DEBUG_ACCOUNT_EMAIL = 'prakashkoulagi.official@gmail.com'

function DebugPanel({ user, onProgressChange }) {
  const [busy, setBusy] = useState(false)

  async function run(patch) {
    setBusy(true)
    try {
      const result = await debugSetRoadmapProgress(user.id, patch)
      onProgressChange(result)
    } finally {
      setBusy(false)
    }
  }

  const nowIso = () => new Date().toISOString()
  const weeksAgoIso = (n) => new Date(Date.now() - n * 7 * 24 * 60 * 60 * 1000).toISOString()

  return (
    <div className="card roadmap-debug-panel">
      <p className="roadmap-debug-label">🛠 Debug — test account only, never visible to real users</p>
      <div className="roadmap-debug-grid">
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run({ stage: 1, startedAt: nowIso(), graduatedAt: null })}>
          Jump to Stage 1
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run({ stage: 2, graduatedAt: null })}>
          Jump to Stage 2
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run({ stage: 3, startedAt: weeksAgoIso(9), graduatedAt: null })}>
          Jump to Stage 3 (floor met)
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run({ stage: 3, graduatedAt: nowIso() })}>
          Force graduate now
        </button>
      </div>
      <button
        type="button"
        className="btn btn-danger btn-block"
        style={{ marginTop: 8 }}
        disabled={busy}
        onClick={() => run({ stage: 1, startedAt: nowIso(), graduatedAt: null })}
      >
        Reset to Day 1 (undo everything above)
      </button>
    </div>
  )
}

// Sequential, mascot-hosted quick-log: one exercise presented at a time
// (matches how Duolingo-style lesson flows actually work - one thing at
// a time, not a full lesson dumped on screen) instead of all 5 rows at
// once. "Skip for now" preserves the earlier decision that partial
// sessions are always allowed - going sequential shouldn't quietly
// remove that. Weight is still required to check something off (same
// reasoning as before: fake numbers corrupt real workout history), skip
// is the escape hatch instead.
function QuickLogSession({ user, exercises, defaultUnit, onLogged }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState({ weight: '', reps: '' })
  const [logged, setLogged] = useState({}) // name -> { weight, reps }
  const [saving, setSaving] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [counterPop, setCounterPop] = useState(false)
  const [finishedCount, setFinishedCount] = useState(null) // null = not finished yet this round

  const loggedCount = Object.keys(logged).length
  const unit = defaultUnit || 'kg'
  const atSummary = stepIndex >= exercises.length
  const current = exercises[stepIndex]

  function advance() {
    setDraft({ weight: '', reps: '' })
    setStepIndex((i) => i + 1)
  }

  function checkOffCurrent() {
    const weight = parseFloat(draft.weight)
    const reps = parseInt(draft.reps || current.defaultReps, 10)
    if (!weight || weight <= 0 || !reps || reps <= 0) return
    setLogged((l) => ({ ...l, [current.name]: { weight, reps } }))
    playCheckSound()
    setCounterPop(true)
    setTimeout(() => setCounterPop(false), 320)
    advance()
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
      setFinishedCount(names.length)
      setLogged({})
      if (allDone) {
        playCelebrationSound()
        setCelebrate(true)
        setTimeout(() => setCelebrate(false), 2200)
      }
      onLogged?.()
    } finally {
      setSaving(false)
    }
  }

  function startAnother() {
    setFinishedCount(null)
    setStepIndex(0)
  }

  const counter = loggedCount > 0 && (
    <span className={`roadmap-session-counter ${counterPop ? 'pop' : ''}`}>{loggedCount} of {exercises.length} logged</span>
  )

  if (atSummary) {
    // Just saved this round - show confirmation instead of the pre-finish
    // summary. Kept as a separate state from stepIndex so the celebration
    // doesn't get wiped out the instant it should appear.
    if (finishedCount != null) {
      return (
        <>
          <div className="hr" />
          {celebrate ? (
            <div className="roadmap-celebrate-block">
              <Confetti />
              <div className="roadmap-mascot-wrap"><Mascot celebrating /></div>
              <p className="roadmap-celebration">🔥 Session logged — nice work!</p>
            </div>
          ) : (
            <p className="small" style={{ margin: '4px 0' }}>Logged {finishedCount} of {exercises.length}. Nice work.</p>
          )}
          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={startAnother}>
            Log another session
          </button>
        </>
      )
    }
    return (
      <>
        <div className="hr" />
        {counter}
        <p className="small" style={{ margin: '0 0 4px' }}>
          {loggedCount === exercises.length
            ? "That's the full session — nice work."
            : loggedCount > 0
              ? "Logged what you did today. Finish whenever you're ready."
              : 'Nothing logged this time - that\'s okay, come back whenever.'}
        </p>
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

  return (
    <>
      <div className="hr" />
      {counter}
      <div className="roadmap-step-dots" aria-hidden="true">
        {exercises.map((ex, i) => {
          const status = i === stepIndex ? 'current' : i < stepIndex ? (logged[ex.name] ? 'done' : 'skipped') : ''
          return <span key={i} className={`roadmap-step-dot ${status}`} />
        })}
      </div>
      <div className="roadmap-step-card" key={stepIndex}>
        <div className="roadmap-mascot-wrap"><Mascot /></div>
        <p className="roadmap-speech-bubble">{current.line}</p>
        <div className="quick-log-row" style={{ borderBottom: 'none' }}>
          <ExerciseIcon name={current.name} />
          <div className="quick-log-info">
            <div className="quick-log-name">{current.name}</div>
            <div className="quick-log-target">{current.target}</div>
          </div>
          <input
            className="quick-log-input"
            placeholder={unit}
            inputMode="decimal"
            value={draft.weight}
            onChange={(e) => setDraft((d) => ({ ...d, weight: e.target.value }))}
            aria-label={`${current.name} weight`}
          />
          <input
            className="quick-log-input"
            placeholder="reps"
            inputMode="numeric"
            value={draft.reps || String(current.defaultReps)}
            onChange={(e) => setDraft((d) => ({ ...d, reps: e.target.value }))}
            aria-label={`${current.name} reps`}
          />
        </div>
        <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={checkOffCurrent}>
          Check off &amp; next
        </button>
        <button type="button" className="roadmap-skip-link" onClick={advance}>
          Skip for now
        </button>
      </div>
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
      <div>
        <div className="card">
          <div className="roadmap-mascot-wrap"><Mascot celebrating /></div>
          <p style={{ fontWeight: 700, fontSize: 16, margin: 0, textAlign: 'center' }}>🎉 You've graduated Beginner</p>
          <p className="small" style={{ marginTop: 6 }}>
            Your regularly-trained lifts stopped moving session to session even after enough time to
            settle — that's the real signal you're ready for Intermediate. The Intermediate roadmap
            isn't built yet, so for now just keep logging as normal; we'll let you know the moment it's ready.
          </p>
        </div>
        {user.email === DEBUG_ACCOUNT_EMAIL && <DebugPanel user={user} onProgressChange={onProgressChange} />}
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

      <div className="card roadmap-path">
        <div className="roadmap-path-line" aria-hidden="true" />
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

      {user.email === DEBUG_ACCOUNT_EMAIL && <DebugPanel user={user} onProgressChange={onProgressChange} />}
    </div>
  )
}
