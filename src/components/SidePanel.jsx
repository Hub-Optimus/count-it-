import { useMemo } from 'react'
import { toKg, fmtWeight, fmtVolume } from '../lib/format'

const e1rm = (weightKg, reps) => {
  const r = Math.min(reps || 0, 12)
  if (!r || !weightKg) return 0
  return weightKg * (1 + r / 30)
}

function daysAgo(iso) {
  const d = new Date(iso + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((now - d) / 86400000)
}

export default function SidePanel({ workouts, profile }) {
  const stats = useMemo(() => {
    let weekCount = 0
    let weekVolume = 0
    let totalVolume = 0
    let bestEver = 0
    const splitCounts = new Map() // split -> { count, lastDate }
    for (const w of workouts) {
      const inWeek = daysAgo(w.date) < 7
      for (const ex of w.exercises) {
        for (const s of ex.sets) {
          if (s.weight == null || !s.reps) continue
          const kg = toKg(Number(s.weight), s.unit)
          const mult = s.per_side ? 2 : 1
          const vol = kg * s.reps * mult
          totalVolume += vol
          if (inWeek) weekVolume += vol
          const est = e1rm(kg, s.reps)
          if (est > bestEver) bestEver = est
        }
      }
      if (inWeek) weekCount += 1
      const entry = splitCounts.get(w.split) || { count: 0, lastDate: w.date }
      entry.count += 1
      if (w.date > entry.lastDate) entry.lastDate = w.date
      splitCounts.set(w.split, entry)
    }
    const splits = [...splitCounts.entries()]
      .map(([split, v]) => ({ split, ...v }))
      .sort((a, b) => b.count - a.count)
    return { weekCount, weekVolume, totalVolume, bestEver, splits, totalSessions: workouts.length }
  }, [workouts])

  const last = workouts[0]

  return (
    <aside className="side-panel">
      {profile?.goals?.length > 0 && (
        <div className="card">
          <label className="label">Your goals</label>
          <div className="chip-row">
            {profile.goals.map((g) => (
              <span key={g} className="chip on" style={{ cursor: 'default' }}>{g}</span>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <label className="label">This week</label>
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-value">{stats.weekCount}</div>
            <div className="stat-label">Workouts</div>
          </div>
          <div className="stat">
            <div className="stat-value">{fmtVolume(stats.weekVolume)}</div>
            <div className="stat-label">Volume</div>
          </div>
        </div>
      </div>

      <div className="card">
        <label className="label">All time</label>
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-value">{stats.totalSessions}</div>
            <div className="stat-label">Sessions</div>
          </div>
          <div className="stat">
            <div className="stat-value">{fmtVolume(stats.totalVolume)}</div>
            <div className="stat-label">Total volume</div>
          </div>
        </div>
        {stats.bestEver > 0 && (
          <p className="small" style={{ margin: '10px 0 0' }}>
            Best estimated 1RM: <strong style={{ color: 'var(--ink)' }}>{fmtWeight(stats.bestEver)} kg</strong>
          </p>
        )}
      </div>

      {stats.splits.length > 0 && (
        <div className="card">
          <label className="label">Split breakdown</label>
          {stats.splits.map((s) => (
            <div className="session-row" key={s.split}>
              <span className="session-date" style={{ minWidth: 0, flex: 1 }}>{s.split}</span>
              <span className="session-best">{s.count}×</span>
            </div>
          ))}
        </div>
      )}

      {last && (
        <div className="card">
          <label className="label">Last session</label>
          <p className="small" style={{ margin: 0 }}>{last.split} · {last.exercises.length} exercises</p>
        </div>
      )}
    </aside>
  )
}
