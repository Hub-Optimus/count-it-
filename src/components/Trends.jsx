import { useMemo, useState, useEffect } from 'react'
import { toKg, fmtVolume, fmtWeight, fmtDate } from '../lib/format'
import { Tally } from './TabBar'

// --- metric helpers ---------------------------------------------------------

// Epley 1RM, capped at 12 reps so 100-rep sets don't inflate strength
const e1rm = (weightKg, reps) => {
  const r = Math.min(reps || 0, 12)
  if (!r || !weightKg) return 0
  return weightKg * (1 + r / 30)
}

// One row per workout: totals we can bucket by period later
function perWorkout(workouts) {
  return workouts.map((w) => {
    let volume = 0
    let best1rm = 0
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        if (s.weight == null || !s.reps) continue
        const kg = toKg(Number(s.weight), s.unit)
        const mult = s.per_side ? 2 : 1
        volume += kg * s.reps * mult
        const est = e1rm(kg, s.reps)
        if (est > best1rm) best1rm = est
      }
    }
    return { date: w.date, volume, best1rm }
  })
}

// --- period bucketing -------------------------------------------------------

// Local YYYY-MM-DD -> Date at local midnight (no UTC shift)
const parseISO = (iso) => new Date(iso + 'T00:00:00')
const pad = (n) => String(n).padStart(2, '0')
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// ISO week number
function isoWeek(d) {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7))
  const week1 = new Date(t.getFullYear(), 0, 4)
  return 1 + Math.round(((t - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}
function isoWeekYear(d) {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7))
  return t.getFullYear()
}

// Bucket key + display label for each period
function bucketOf(iso, period) {
  const d = parseISO(iso)
  if (period === 'day') return { key: iso, label: fmtDate(iso) }
  if (period === 'week') {
    const wy = isoWeekYear(d)
    const w = isoWeek(d)
    return { key: `${wy}-W${pad(w)}`, label: `W${w}` }
  }
  if (period === 'month') {
    const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    const label = d.toLocaleDateString('en-IN', { month: 'short' })
    return { key: k, label }
  }
  return { key: String(d.getFullYear()), label: String(d.getFullYear()) }
}

// How many buckets to show for each period (fits ~7 bars comfortably on mobile)
const WINDOW = { day: 14, week: 12, month: 12, year: 5 }

function buildBuckets(rows, period, metric) {
  const map = new Map()
  for (const r of rows) {
    const { key, label } = bucketOf(r.date, period)
    if (!map.has(key)) map.set(key, { key, label, value: 0, workouts: 0 })
    const b = map.get(key)
    b.workouts += 1
    if (metric === 'volume') b.value += r.volume
    else if (metric === 'strength') b.value = Math.max(b.value, r.best1rm)
    else b.value += 1 // consistency
  }
  const sorted = [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1))
  return sorted.slice(-WINDOW[period])
}

// --- chart ------------------------------------------------------------------

function BarChart({ buckets, metric, onPick, picked }) {
  const W = 320
  const H = 170
  const PX = 6
  const PY_TOP = 14
  const PY_BOT = 22
  const usable = W - 2 * PX
  const barW = Math.max(6, (usable / buckets.length) * 0.7)
  const gap = (usable - barW * buckets.length) / buckets.length
  const max = Math.max(...buckets.map((b) => b.value), 0.01)
  const y = (v) => H - PY_BOT - (v / max) * (H - PY_TOP - PY_BOT)

  const showEveryNth = Math.ceil(buckets.length / 7)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Trend chart">
      <line x1={PX} y1={H - PY_BOT} x2={W - PX} y2={H - PY_BOT} stroke="var(--line)" />
      {buckets.map((b, i) => {
        const bx = PX + gap / 2 + i * (barW + gap)
        const by = y(b.value)
        const on = picked === b.key
        return (
          <g key={b.key} onClick={() => onPick(b.key)} style={{ cursor: 'pointer' }}>
            <rect x={bx} y={PY_TOP} width={barW} height={H - PY_BOT - PY_TOP} fill="transparent" />
            <rect x={bx} y={by} width={barW} height={H - PY_BOT - by} rx="2"
              fill={on ? 'var(--ink)' : 'var(--yellow)'} opacity={b.value === 0 ? 0.25 : 1} />
            {i % showEveryNth === 0 && (
              <text x={bx + barW / 2} y={H - 6} fill="var(--ink-faint)" fontSize="9" textAnchor="middle">
                {b.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// --- component --------------------------------------------------------------

const PERIODS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
]

const METRICS = [
  { id: 'strength', label: 'Strength' },
  { id: 'volume', label: 'Volume' },
  { id: 'consistency', label: 'Consistency' },
]

// Map goals -> default metric (goal-aware from day one)
function defaultMetricFor(profile) {
  const g = profile?.goals || []
  if (g.includes('Build strength')) return 'strength'
  if (g.includes('Build muscle')) return 'volume'
  if (g.includes('Lose weight') || g.includes('Improve stamina')) return 'consistency'
  if (g.includes('Gain weight')) return 'volume'
  return 'volume'
}

function metricLabel(metric) {
  if (metric === 'strength') return 'Best estimated 1-rep max'
  if (metric === 'volume') return 'Total volume'
  return 'Workouts'
}

function fmtValue(v, metric) {
  if (metric === 'consistency') return String(Math.round(v))
  if (metric === 'strength') return `${fmtWeight(v)} kg`
  return fmtVolume(v)
}

export default function Trends({ workouts, profile }) {
  const [period, setPeriod] = useState('week')
  const [metric, setMetric] = useState(() => defaultMetricFor(profile))
  const [picked, setPicked] = useState(null)

  // Re-apply the goal default if goals change (e.g. user edits in Settings)
  useEffect(() => { setMetric(defaultMetricFor(profile)) }, [profile])

  const rows = useMemo(() => perWorkout(workouts), [workouts])
  const buckets = useMemo(() => buildBuckets(rows, period, metric), [rows, period, metric])
  const total = useMemo(() => {
    if (metric === 'strength') return Math.max(0, ...buckets.map((b) => b.value))
    return buckets.reduce((n, b) => n + b.value, 0)
  }, [buckets, metric])
  const workoutsInWindow = buckets.reduce((n, b) => n + b.workouts, 0)

  if (!workouts.length) {
    return (
      <div className="empty">
        <Tally size={44} />
        <p>Nothing to chart yet.</p>
        <p className="small">Log a workout and your trend shows up here.</p>
      </div>
    )
  }

  const pickedBucket = buckets.find((b) => b.key === picked)

  return (
    <div>
      <div className="chip-row">
        {PERIODS.map((p) => (
          <button key={p.id} className={`chip ${period === p.id ? 'on' : ''}`} onClick={() => { setPeriod(p.id); setPicked(null) }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="chip-row">
        {METRICS.map((m) => (
          <button key={m.id} className={`chip ${metric === m.id ? 'on' : ''}`} onClick={() => { setMetric(m.id); setPicked(null) }}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="chart-wrap">
        <BarChart buckets={buckets} metric={metric} picked={picked} onPick={(k) => setPicked(k === picked ? null : k)} />
        <div className="chart-caption">
          {pickedBucket
            ? `${pickedBucket.label} · ${fmtValue(pickedBucket.value, metric)} · ${pickedBucket.workouts} workout${pickedBucket.workouts === 1 ? '' : 's'}`
            : `${metricLabel(metric)} per ${period}`}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-value">{workoutsInWindow}</div>
          <div className="stat-label">Workouts in view</div>
        </div>
        <div className="stat">
          <div className="stat-value">{fmtValue(total, metric)}</div>
          <div className="stat-label">{metric === 'strength' ? 'Peak in view' : metric === 'volume' ? 'Volume in view' : 'Total in view'}</div>
        </div>
      </div>
    </div>
  )
}
