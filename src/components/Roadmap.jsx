import { useEffect, useMemo } from 'react'
import {
  BEGINNER_STAGES, STAGE_EXIT_DAYS, GRADUATION_MIN_WEEKS,
  nextStage, distinctLoggedDays, weeksSince, isReadyToGraduate, stage1Prescription,
} from '../lib/roadmap'
import { advanceRoadmapStage, markRoadmapGraduated } from '../lib/db'
import { Tally } from './TabBar'

// The gamified overview - "where am I, what's next" - plus, for Stage 1
// specifically, an actual "start today's session" action, since that's
// the only stage with real content built yet. Stages 2/3 don't have
// their own template content yet, so they stay overview-only for now -
// not an oversight, just not built.
export default function Roadmap({ user, workouts, profile, roadmapProgress, onProgressChange, onStartTemplate }) {
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
          <>
            <div className="hr" />
            <p className="small" style={{ margin: '0 0 8px' }}>Today's session — same movements every time this stage, weight goes in when you log it:</p>
            {stage1Exercises.map((ex) => (
              <div className="session-row" key={ex.name}>
                <span className="session-date" style={{ flex: 1, minWidth: 0 }}>{ex.name}</span>
                <span className="small">{ex.target}</span>
              </div>
            ))}
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 10 }}
              onClick={() => onStartTemplate(stage1Exercises.map((ex) => ex.name))}
            >
              Start today's session
            </button>
          </>
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
