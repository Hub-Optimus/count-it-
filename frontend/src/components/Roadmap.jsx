import { useEffect, useMemo, useState } from 'react'
import {
  BEGINNER_STAGES, STAGE_EXIT_DAYS, GRADUATION_MIN_WEEKS, GRADUATION_REWARD_AMOUNT,
  STAGE_2_MILESTONES, STAGE_2_MILESTONE_COPY, nextPendingStage2Milestone,
  nextStage, distinctLoggedDays, weeksSince, isReadyToGraduate, stage1Prescription,
  STAGE_1_VIDEO_IDS, youtubeEmbedUrl,
} from '../lib/roadmap'
import {
  advanceRoadmapStage, markRoadmapGraduated, insertFullWorkout, debugSetRoadmapProgress,
  markStage2MilestoneSeen, fetchVideos,
} from '../lib/db'
import { pictogramFor, groupFor, GROUP_COLOR } from '../lib/exerciseLibrary'
import { PICTOGRAMS } from '../lib/pictograms'
import { todayISO } from '../lib/format'
import { playCheckSound, playCelebrationSound } from '../lib/sound'
import LearningVideos from './LearningVideos'
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

// A short, always-available explanation of the whole journey - what each
// stage actually requires and what's waiting at the end. Collapsed by
// default so it doesn't compete with the stage card for a returning
// user, but easy to re-open any time.
function JourneyExplainer() {
  const [open, setOpen] = useState(false)
  return (
    <div className="card">
      <button
        type="button"
        className="text-link-btn"
        style={{ fontWeight: 600, fontSize: 14 }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '▾' : '▸'} How does Beginner → Intermediate work?
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <p className="small" style={{ margin: '0 0 8px' }}>
            <strong>Stage 1 — Learn the Lifts.</strong> Log {STAGE_EXIT_DAYS[1]} different training days,
            focused on getting the movements right - weight doesn't matter yet.
          </p>
          <p className="small" style={{ margin: '0 0 8px' }}>
            <strong>Stage 2 — Build the Base.</strong> Keep training consistently until you've logged{' '}
            {STAGE_EXIT_DAYS[2]} days total - roughly a month at 3x/week.
          </p>
          <p className="small" style={{ margin: '0 0 8px' }}>
            <strong>Stage 3 — Ready to Graduate.</strong> After at least {GRADUATION_MIN_WEEKS} weeks, we check
            whether your main lifts have stopped improving session to session. Once they've levelled off,
            that's the real signal your body's adapted and you're ready for Intermediate.
          </p>
          <p className="small" style={{ margin: 0 }}>
            🎉 <strong>Graduate and you earn ₹{GRADUATION_REWARD_AMOUNT}</strong> as a thank-you for sticking with it.
          </p>
        </div>
      )}
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
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(exercises.map((ex) => [ex.name, { weight: '', reps: String(ex.defaultReps), done: false }])),
  )
  const [saving, setSaving] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [finishedCount, setFinishedCount] = useState(null) // null = not finished yet this round
  const [videoModalFor, setVideoModalFor] = useState(null) // exercise name shown in the video popup, or null
  const [uploadedVideos, setUploadedVideos] = useState([])

  useEffect(() => {
    fetchVideos().then(setUploadedVideos).catch(() => setUploadedVideos([]))
  }, [])

  // An admin-uploaded video tagged with this exact exercise name always
  // wins over the built-in YouTube embed - upload one and it takes over
  // automatically, no code change needed.
  function videoFor(name) {
    const uploaded = uploadedVideos.find((v) => v.exerciseName === name)
    if (uploaded) return { type: 'uploaded', url: uploaded.url }
    const ytId = STAGE_1_VIDEO_IDS[name]
    return ytId ? { type: 'youtube', url: youtubeEmbedUrl(ytId) } : null
  }

  const unit = defaultUnit || 'kg'
  const doneCount = Object.values(drafts).filter((d) => d.done).length

  function updateDraft(name, field, value) {
    setDrafts((d) => ({ ...d, [name]: { ...d[name], [field]: value } }))
  }

  function toggleDone(name) {
    setDrafts((d) => {
      const entry = d[name]
      if (!entry.done) {
        const weight = parseFloat(entry.weight)
        const reps = parseInt(entry.reps, 10)
        if (!weight || weight <= 0 || !reps || reps <= 0) return d // need real numbers before it can be checked off
        playCheckSound()
      }
      return { ...d, [name]: { ...entry, done: !entry.done } }
    })
  }

  async function finishSession() {
    const doneNames = exercises.filter((ex) => drafts[ex.name].done).map((ex) => ex.name)
    if (!doneNames.length) return
    setSaving(true)
    try {
      const exercisesPayload = doneNames.map((name) => ({
        name,
        notes: null,
        sets: [{ weight: parseFloat(drafts[name].weight), unit, reps: parseInt(drafts[name].reps, 10), warmup: false }],
      }))
      await insertFullWorkout(user.id, { date: todayISO(), split: null, notes: null, exercises: exercisesPayload })
      const allDone = doneNames.length === exercises.length
      setFinishedCount(doneNames.length)
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
    setDrafts(Object.fromEntries(exercises.map((ex) => [ex.name, { weight: '', reps: String(ex.defaultReps), done: false }])))
  }

  if (finishedCount != null) {
    // Just saved this round - show confirmation instead of the list.
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
      {doneCount > 0 && <span className="roadmap-session-counter">{doneCount} of {exercises.length} logged</span>}
      {exercises.map((ex) => {
        const entry = drafts[ex.name]
        const video = videoFor(ex.name)
        return (
          <div className="quick-log-row" key={ex.name}>
            <ExerciseIcon name={ex.name} />
            <div className="quick-log-info">
              <div className="quick-log-name">{ex.name}</div>
              <div className="quick-log-target">{ex.target}</div>
              {video && (
                <button
                  type="button"
                  className="text-link-btn"
                  style={{ padding: 0, marginTop: 2 }}
                  onClick={() => setVideoModalFor(ex.name)}
                >
                  ▶ How to do this
                </button>
              )}
            </div>
            <input
              className="quick-log-input"
              placeholder={unit}
              inputMode="decimal"
              value={entry.weight}
              disabled={entry.done}
              onChange={(e) => updateDraft(ex.name, 'weight', e.target.value)}
              aria-label={`${ex.name} weight`}
            />
            <input
              className="quick-log-input"
              placeholder="reps"
              inputMode="numeric"
              value={entry.reps}
              disabled={entry.done}
              onChange={(e) => updateDraft(ex.name, 'reps', e.target.value)}
              aria-label={`${ex.name} reps`}
            />
            <button
              type="button"
              className={`quick-log-check ${entry.done ? 'done' : ''}`}
              onClick={() => toggleDone(ex.name)}
              aria-label={entry.done ? `Mark ${ex.name} not done` : `Mark ${ex.name} done`}
            >
              {entry.done ? '✓' : ''}
            </button>
          </div>
        )
      })}
      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 10 }}
        disabled={doneCount === 0 || saving}
        onClick={finishSession}
      >
        {saving ? 'Saving…' : `Finish session${doneCount ? ` (${doneCount})` : ''}`}
      </button>

      {videoModalFor && (
        <div className="timer-modal-overlay" onClick={() => setVideoModalFor(null)}>
          <div className="roadmap-video-modal" onClick={(e) => e.stopPropagation()}>
            <div className="timer-modal-header">
              <p style={{ fontWeight: 700, margin: 0 }}>{videoModalFor}</p>
              <button className="btn btn-ghost" onClick={() => setVideoModalFor(null)} aria-label="Close">✕</button>
            </div>
            {(() => {
              const video = videoFor(videoModalFor)
              if (!video) return null
              return video.type === 'uploaded' ? (
                <video
                  controls
                  autoPlay
                  preload="metadata"
                  src={video.url}
                  style={{ width: '100%', borderRadius: 8, background: '#000' }}
                />
              ) : (
                <iframe
                  width="100%"
                  height="220"
                  src={video.url}
                  title={`${videoModalFor} how-to`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ borderRadius: 8, display: 'block' }}
                />
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}

// The gamified overview - "where am I, what's next" - plus, for Stage 1
// specifically, an actual inline quick-log, since that's the only stage
// with real content built yet. Stages 2/3 don't have their own template
// content yet, so they stay overview-only for now - not an oversight,
// just not built.
export default function Roadmap({ user, workouts, profile, defaultUnit, roadmapProgress, onProgressChange, onLogged }) {
  const days = useMemo(() => distinctLoggedDays(workouts, roadmapProgress?.started_at), [workouts, roadmapProgress])
  const stage1Exercises = useMemo(() => stage1Prescription(profile?.goal_priority ?? []), [profile])
  const computedStage = useMemo(
    () => (roadmapProgress ? nextStage(roadmapProgress.stage, workouts, roadmapProgress.started_at) : null),
    [roadmapProgress, workouts],
  )
  const readyToGraduate = useMemo(
    () => isReadyToGraduate(roadmapProgress, workouts),
    [roadmapProgress, workouts],
  )
  const [celebratingMilestone, setCelebratingMilestone] = useState(null)

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

  // Small checkpoints inside Stage 2's long grind (day 3/6/9) - shows one
  // celebration at a time, persists it as seen so it never repeats even
  // across sessions.
  useEffect(() => {
    if (!roadmapProgress || roadmapProgress.stage !== 2) return
    const pending = nextPendingStage2Milestone(days, roadmapProgress.stage2_milestones_seen)
    if (pending == null) return
    setCelebratingMilestone(pending)
    markStage2MilestoneSeen(user.id, pending)
      .then(() => onProgressChange({
        ...roadmapProgress,
        stage2_milestones_seen: [...(roadmapProgress.stage2_milestones_seen || []), pending],
      }))
      .catch(() => {})
    const t = setTimeout(() => setCelebratingMilestone(null), 2600)
    return () => clearTimeout(t)
  }, [days, roadmapProgress, user.id, onProgressChange])

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
        {roadmapProgress.reward_status === 'earned' && (
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>
              💰 You earned ₹{roadmapProgress.reward_amount}!
            </p>
            <p className="small" style={{ marginTop: 4 }}>
              Nice work finishing the Beginner roadmap. Payout details coming soon.
            </p>
          </div>
        )}
        <LearningVideos user={user} />
        {user.email === DEBUG_ACCOUNT_EMAIL && <DebugPanel user={user} onProgressChange={onProgressChange} />}
      </div>
    )
  }

  const stage = roadmapProgress.stage
  const current = BEGINNER_STAGES.find((s) => s.id === stage)

  return (
    <div>
      <JourneyExplainer />

      {celebratingMilestone != null && (
        <div className="card roadmap-celebrate-block">
          <Confetti />
          <div className="roadmap-mascot-wrap"><Mascot celebrating /></div>
          <p className="roadmap-celebration">
            {STAGE_2_MILESTONE_COPY[celebratingMilestone].emoji} {STAGE_2_MILESTONE_COPY[celebratingMilestone].message}
          </p>
        </div>
      )}

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
              {stage === 2 && STAGE_2_MILESTONES.map((day) => (
                <div key={day} className="roadmap-bar-milestone" style={{ left: `${(day / STAGE_EXIT_DAYS[2]) * 100}%` }} />
              ))}
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

      {/* Stage 1 has its own per-exercise "how to" video links. Stage 2
          is the long grind (12 days) - keeping it distraction-free with
          just the progress bar and milestones. Video library shows up
          again once someone reaches Stage 3. */}
      {stage === 3 && <LearningVideos user={user} />}

      {user.email === DEBUG_ACCOUNT_EMAIL && <DebugPanel user={user} onProgressChange={onProgressChange} />}
    </div>
  )
}