import { toKg } from './format'

const e1rm = (weightKg, reps) => {
  const r = Math.min(reps || 0, 12)
  if (!r || !weightKg) return 0
  return weightKg * (1 + r / 30)
}

function volumeAndBestE1rm(workout) {
  let volume = 0
  let best = 0
  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      if (s.weight == null || !s.reps) continue
      const kg = toKg(Number(s.weight), s.unit)
      const mult = s.per_side ? 2 : 1
      volume += kg * s.reps * mult
      const est = e1rm(kg, s.reps)
      if (est > best) best = est
    }
  }
  return { volume, bestE1rm: best }
}

const DAY = 86400000
const parseISO = (iso) => new Date(iso + 'T00:00:00')

// ISO week key, e.g. "2026-W29" - used so a streak counts distinct
// calendar weeks trained, not raw days (matches how a lifter thinks
// about "did I train this week").
function isoWeekKey(d) {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7))
  const week1 = new Date(t.getFullYear(), 0, 4)
  const w = 1 + Math.round(((t - week1) / DAY - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${t.getFullYear()}-W${String(w).padStart(2, '0')}`
}

// Consecutive calendar weeks (up to and including the current week or the
// most recent trained week) with at least one workout. Counts backward
// from today so a streak doesn't silently include a future gap.
export function currentStreakWeeks(workouts, today = new Date()) {
  if (!workouts.length) return 0
  const weeksTrained = new Set(workouts.map((w) => isoWeekKey(parseISO(w.date))))
  let streak = 0
  let cursor = new Date(today)
  // if this week has no session yet, don't break the streak on week 0 -
  // start counting from the most recent week that DOES have a session
  if (!weeksTrained.has(isoWeekKey(cursor))) {
    cursor.setDate(cursor.getDate() - 7)
  }
  while (weeksTrained.has(isoWeekKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

// Exercises where the most recent time they were logged set a new best
// (highest estimated 1RM ever recorded for that exercise), most recent first.
export function recentPRs(workouts, withinDays = 14, today = new Date()) {
  const byExercise = new Map() // name -> [{date, e1rm}]
  const asc = [...workouts].sort((a, b) => a.date.localeCompare(b.date))
  for (const w of asc) {
    for (const ex of w.exercises) {
      let best = 0
      for (const s of ex.sets) {
        if (s.weight == null || !s.reps) continue
        const est = e1rm(toKg(Number(s.weight), s.unit), s.reps)
        if (est > best) best = est
      }
      if (best <= 0) continue
      if (!byExercise.has(ex.name)) byExercise.set(ex.name, [])
      byExercise.get(ex.name).push({ date: w.date, e1rm: best })
    }
  }
  const prs = []
  const cutoff = new Date(today.getTime() - withinDays * DAY)
  for (const [name, sessions] of byExercise) {
    let runningBest = 0
    let hasPrior = false
    for (const s of sessions) {
      if (hasPrior && s.e1rm > runningBest) {
        if (parseISO(s.date) >= cutoff) {
          prs.push({ name, date: s.date, e1rm: s.e1rm })
        }
      }
      if (s.e1rm > runningBest) runningBest = s.e1rm
      hasPrior = true
    }
  }
  prs.sort((a, b) => b.date.localeCompare(a.date))
  return prs
}

// Sum of a metric over workouts whose date falls within [start, end).
function sumInRange(workouts, start, end, pick) {
  let total = 0
  let count = 0
  for (const w of workouts) {
    const d = parseISO(w.date)
    if (d >= start && d < end) {
      total += pick(w)
      count += 1
    }
  }
  return { total, count }
}

// Percent change from `prev` to `curr`, null if prev is 0 (undefined change).
export function pctChange(curr, prev) {
  if (prev <= 0) return null
  return ((curr - prev) / prev) * 100
}

// Average logged body weight (kg) within [start, end), or null if no entries.
function avgWeightInRange(bodyMetrics, start, end) {
  const vals = bodyMetrics
    .filter((m) => { const d = parseISO(m.date); return d >= start && d < end && m.weight != null })
    .map((m) => toKg(Number(m.weight), m.weight_unit))
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

// Per-goal status over the trailing `days` window vs the window before it.
// bodyMetrics (optional) enables real Lose/Gain weight tracking; without
// it those goals fall back to an honest "can't track" result.
export function goalStatus(workouts, goals, days = 28, today = new Date(), bodyMetrics = []) {
  const windowEnd = new Date(today.getTime() + DAY) // inclusive of today
  const windowStart = new Date(windowEnd.getTime() - days * DAY)
  const prevStart = new Date(windowStart.getTime() - days * DAY)

  const perWorkout = workouts.map((w) => ({ date: w.date, ...volumeAndBestE1rm(w) }))

  const curr = sumInRange(perWorkout, windowStart, windowEnd, (w) => w.volume)
  const prev = sumInRange(perWorkout, prevStart, windowStart, (w) => w.volume)
  const currBestE1rm = Math.max(0, ...perWorkout.filter((w) => parseISO(w.date) >= windowStart && parseISO(w.date) < windowEnd).map((w) => w.bestE1rm))
  const prevBestE1rm = Math.max(0, ...perWorkout.filter((w) => parseISO(w.date) >= prevStart && parseISO(w.date) < windowStart).map((w) => w.bestE1rm))

  const currWeight = avgWeightInRange(bodyMetrics, windowStart, windowEnd)
  const prevWeight = avgWeightInRange(bodyMetrics, prevStart, windowStart)
  const weightChange = (currWeight != null && prevWeight != null && prevWeight > 0)
    ? ((currWeight - prevWeight) / prevWeight) * 100
    : null

  const results = []
  for (const goal of goals) {
    if (goal === 'Build strength') {
      const change = pctChange(currBestE1rm, prevBestE1rm)
      results.push({
        goal, metric: 'Estimated 1RM', current: currBestE1rm, change,
        onTrack: change == null ? null : change >= 0,
      })
    } else if (goal === 'Build muscle') {
      const change = pctChange(curr.total, prev.total)
      results.push({
        goal, metric: 'Training volume', current: curr.total, change,
        onTrack: change == null ? null : change >= 0,
      })
    } else if (goal === 'Improve stamina' || goal === 'General fitness') {
      const change = pctChange(curr.count, prev.count)
      results.push({
        goal, metric: 'Workouts logged', current: curr.count, change,
        onTrack: change == null ? null : change >= 0,
      })
    } else if (goal === 'Lose weight' || goal === 'Gain weight') {
      if (weightChange == null) {
        results.push({ goal, metric: null, current: null, change: null, onTrack: null, needsWeightLog: true })
      } else {
        // direction of "good" flips between these two goals - losing
        // weight going DOWN is on-track for "Lose weight" but OFF track
        // for "Gain weight", and vice versa
        const wantsDown = goal === 'Lose weight'
        results.push({
          goal, metric: 'Body weight', current: currWeight, change: weightChange,
          onTrack: wantsDown ? weightChange <= 0 : weightChange >= 0,
        })
      }
    } else {
      results.push({ goal, metric: null, current: null, change: null, onTrack: null, unsupported: true })
    }
  }
  return results
}
