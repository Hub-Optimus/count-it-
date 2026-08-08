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

// ---- Stage 1 starter session ----
//
// 5 movement patterns, universal for every beginner regardless of goal -
// form literacy doesn't change by goal, only the rep/set prescription
// does. Names are exact matches in exerciseLibrary.js, checked against
// the real file rather than guessed, so the search/log flow won't miss
// on a name that doesn't exist.

export const STAGE_1_EXERCISES = [
  { pattern: 'Squat', name: 'Dumbbell Squat', line: "First up — Dumbbell Squat. Sit back like you're reaching for a chair." },
  { pattern: 'Hinge', name: 'Dumbbell Romanian Deadlift', line: 'Romanian Deadlift — hinge at the hips, keep that back flat.' },
  { pattern: 'Push', name: 'Push-up', line: 'Push-up time — squeeze your core the whole way down.' },
  { pattern: 'Pull', name: 'Dumbbell Bent Over Row', line: 'Bent Over Row — pull with your back, not just your arms.' },
  { pattern: 'Core', name: 'Dead Bug', line: 'Last one — Dead Bug. Slow and controlled beats fast and sloppy.' },
]

const GOAL_REP_TARGETS = {
  strength: { display: '5 reps × 5 sets', defaultReps: 5 },
  build_muscle: { display: '8-12 reps × 3-4 sets', defaultReps: 10 },
  general_fitness: { display: '8-12 reps × 3-4 sets', defaultReps: 10 },
  maintain: { display: '8-12 reps × 3-4 sets', defaultReps: 10 }, // no clear direction for this goal - same moderate default as general fitness
  lose_fat: { display: '12-15 reps × 3 sets', defaultReps: 13 },
  endurance: { display: '15-20 reps × 2-3 sets', defaultReps: 17 },
}

// Dead Bug is a stability drill, not a load-and-recover compound lift -
// core endurance doesn't map onto strength/hypertrophy rep ranges the
// same way, so it stays the same for every goal rather than forcing a
// distinction onto it that wouldn't mean anything. Logged as one plain
// rep count (not per-side) to keep the quick-log flow simple - the full
// editor's per-side tracking is still there if someone wants it.
const CORE_TARGET = { display: '8-10 reps per side × 3 sets', defaultReps: 9 }

// goalPriority[0] (top-ranked goal) drives the prescription - the rest
// of the ranked list doesn't affect Stage 1's numbers, only which chart
// goals light up (see Onboarding.jsx's chartGoalsFor).
export function stage1Prescription(goalPriority) {
  const target = GOAL_REP_TARGETS[goalPriority?.[0]] ?? GOAL_REP_TARGETS.general_fitness
  return STAGE_1_EXERCISES.map((ex) => {
    const t = ex.pattern === 'Core' ? CORE_TARGET : target
    return { ...ex, target: t.display, defaultReps: t.defaultReps }
  })
}

// ---- Stage 1 -> 2 and Stage 2 -> 3: session-count thresholds ----
//
// Distinct logged days, not total sets - "did you show up" is the
// relevant signal this early, not volume.

const STAGE_1_EXIT_DAYS = 3   // enough to have tried the basics at least a few times
const STAGE_2_EXIT_DAYS = 12  // roughly a month at 3x/week - the real grind

export const STAGE_EXIT_DAYS = { 1: STAGE_1_EXIT_DAYS, 2: STAGE_2_EXIT_DAYS }

export function distinctLoggedDays(workouts, sinceIso) {
  // Date-level (not time-of-day) comparison: this is deliberate for real
  // users - their started_at is set once at roadmap init and never
  // touched again, so this always lines up with actual calendar days.
  // It only gets fuzzy for the debug tools specifically, when someone
  // resets and re-logs within the same day - a workout logged earlier
  // that same day still counts, since dates don't carry a time. That's
  // a debug-only quirk, not something a real user would ever hit.
  const since = sinceIso ? sinceIso.slice(0, 10) : null
  const relevant = since ? workouts.filter((w) => w.date >= since) : workouts
  return new Set(relevant.map((w) => w.date)).size
}

export function weeksSince(dateIso) {
  return (Date.now() - new Date(dateIso).getTime()) / (7 * 24 * 60 * 60 * 1000)
}

// Returns the stage the user should be on given their logged history.
// Never moves a user backward - only forward or unchanged. Counts days
// since the current stage's started_at, not all-time - otherwise once
// someone has enough total history, manually resetting the stage (debug
// tools, or a future real "restart" action) gets immediately overridden
// back up by this same function on the very next render.
export function nextStage(currentStage, workouts, startedAtIso) {
  const days = distinctLoggedDays(workouts, startedAtIso)
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

export const GRADUATION_MIN_WEEKS = 8 // duration floor - agreed 2026-08-04
export const GRADUATION_REWARD_AMOUNT = 50 // matches backend GRADUATION_REWARD_AMOUNT - keep in sync
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