import { toKg } from './format'

// ---- Beginner roadmap content ----
//
// 3 stages, each mapping to a real shift in what the person is doing -
// not an arbitrary progress bar. Stage 2 is deliberately the long one
// (this is the weeks 1-12 dropout window); its own milestone/badge
// cadence lives with the streak system (a later phase), not here.

export const BEGINNER_STAGES = [
  {
    id: 1,
    label: 'Learn the Lifts',
    blurb: 'Get familiar with the movements — weight matters less than form right now.',
  },
  {
    id: 2,
    label: 'Build the Base',
    blurb: 'The real work: consistent sessions, steady progression.',
  },
  {
    id: 3,
    label: 'Ready to Graduate',
    blurb: "You're closing in on Intermediate — we're just confirming it's real before moving you.",
  },
]

// ---- Stage 1 -> 2 and Stage 2 -> 3: session-count thresholds ----
//
// Distinct logged days, not total sets - "did you show up" is the
// relevant signal this early, not volume.

const STAGE_1_EXIT_DAYS = 3   // enough to have tried the basics at least a few times
const STAGE_2_EXIT_DAYS = 12  // roughly a month at 3x/week - the real grind

function distinctLoggedDays(workouts) {
  return new Set(workouts.map((w) => w.date)).size
}

// Returns the stage the user should be on given their logged history.
// Never moves a user backward - only forward or unchanged.
export function nextStage(currentStage, workouts) {
  const days = distinctLoggedDays(workouts)
  if (currentStage === 1 && days >= STAGE_1_EXIT_DAYS) return 2
  if (currentStage === 2 && days >= STAGE_2_EXIT_DAYS) return 3
  return currentStage
}

// ---- Stage 3 -> Graduated: hybrid (duration floor + real performance) ----
//
// Matches how real beginner strength programs actually graduate people
// (StrongLifts, Starting Strength): not a calendar, but "no longer
// progressing session to session." Reuses the same estimated-1RM math
// already used for "Best set ever" (setComparison.js) rather than
// inventing a second progress metric.

const GRADUATION_MIN_WEEKS = 8 // duration floor - agreed 2026-08-04
const PLATEAU_WINDOW_SESSIONS = 4
const MIN_SESSIONS_TO_JUDGE = 4

function e1rm(weightKg, reps) {
  const r = Math.min(reps || 0, 12)
  if (!r || !weightKg) return 0
  return weightKg * (1 + r / 30)
}

function bestSetE1rm(exercise) {
  let best = 0
  for (const s of exercise.sets) {
    if (s.weight == null || !s.reps || s.warmup) continue
    best = Math.max(best, e1rm(toKg(Number(s.weight), s.unit), s.reps))
  }
  return best
}

function recentE1rmTrend(workouts, exerciseName, sessionCount) {
  const nl = exerciseName.trim().toLowerCase()
  return workouts
    .filter((w) => w.exercises.some((ex) => ex.name.trim().toLowerCase() === nl))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-sessionCount)
    .map((w) => bestSetE1rm(w.exercises.find((ex) => ex.name.trim().toLowerCase() === nl)))
}

// True if the most recent session's estimated 1RM is no higher than the
// earliest of the last PLATEAU_WINDOW_SESSIONS sessions - i.e. no real
// improvement across the whole window, not just one flat session.
// Returns false (benefit of the doubt) when there isn't enough history
// yet to judge fairly.
function hasStalled(workouts, exerciseName) {
  const trend = recentE1rmTrend(workouts, exerciseName, PLATEAU_WINDOW_SESSIONS)
  if (trend.length < MIN_SESSIONS_TO_JUDGE) return false
  const earliest = trend[0]
  const latest = trend[trend.length - 1]
  if (!earliest || !latest) return false
  return latest <= earliest
}

// Exercises logged often enough to fairly judge (not one-off accessory
// lifts tried once).
function regularlyTrainedExercises(workouts) {
  const counts = new Map()
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const key = ex.name.trim().toLowerCase()
      counts.set(key, (counts.get(key) || 0) + 1)
    }
  }
  return [...counts.entries()].filter(([, c]) => c >= MIN_SESSIONS_TO_JUDGE).map(([name]) => name)
}

// True if a majority of the user's regularly-trained exercises have
// stalled. No regularly-trained exercises yet -> not plateaued, just
// too early to tell.
export function hasPlateaued(workouts) {
  const exercises = regularlyTrainedExercises(workouts)
  if (!exercises.length) return false
  const stalledCount = exercises.filter((name) => hasStalled(workouts, name)).length
  return stalledCount / exercises.length >= 0.5
}

// The actual hybrid graduation check. Duration floor first (cheap, no
// data needed) so a brand-new Stage-3 user can't graduate off a lucky
// early plateau read; real performance data decides after that.
export function isReadyToGraduate(roadmapProgress, workouts) {
  if (!roadmapProgress || roadmapProgress.stage !== 3 || roadmapProgress.graduated_at) return false
  const weeksElapsed = (Date.now() - new Date(roadmapProgress.started_at).getTime()) / (7 * 24 * 60 * 60 * 1000)
  if (weeksElapsed < GRADUATION_MIN_WEEKS) return false
  return hasPlateaued(workouts)
}
