import { useMemo } from 'react'
import { toKg, fmtWeight, fmtVolume } from '../lib/format'
import { groupFor } from '../lib/exerciseLibrary'
import { pctChange } from '../lib/goalAnalytics'

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
    let lastWeekCount = 0
    let lastWeekVolume = 0
    let totalVolume = 0
    let bestEver = 0
    const muscleCounts = new Map() // group -> session count (a session can count toward several groups)
    for (const w of workouts) {
      const age = daysAgo(w.date)
      const inWeek = age < 7
      const inLastWeek = age >= 7 && age < 14
      const groupsThisSession = new Set()
      for (const ex of w.exercises) {
        const g = groupFor(ex.name)
        if (g) groupsThisSession.add(g)
        for (const s of ex.sets) {
          if (s.weight == null || !s.reps) continue
          const kg = toKg(Number(s.weight), s.unit)
          const mult = s.per_side ? 2 : 1
          const vol = kg * s.reps * mult
          totalVolume += vol
          if (inWeek) weekVolume += vol
          if (inLastWeek) lastWeekVolume += vol
          const est = e1rm(kg, s.reps)
          if (est > bestEver) bestEver = est
        }
      }
      if (inWeek) weekCount += 1
      if (inLastWeek) lastWeekCount += 1
      for (const g of groupsThisSession) {
        muscleCounts.set(g, (muscleCounts.get(g) || 0) + 1)
      }
    }
    const muscles = [...muscleCounts.entries()]
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
    return {
      weekCount, weekVolume, totalVolume, bestEver, muscles, totalSessions: workouts.length,
      countChange: pctChange(weekCount, lastWeekCount),
      volumeChange: pctChange(weekVolume, lastWeekVolume),
    }
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
            {stats.countChange != null && (
              <div className={`trend-arrow ${stats.countChange >= 0 ? 'trend-up' : 'trend-down'}`} style={{ marginTop: 4 }}>
                {stats.countChange >= 0 ? '↑' : '↓'} {Math.round(Math.abs(stats.countChange))}% vs last wk
              </div>
            )}
          </div>
          <div className="stat">
            <div className="stat-value">{fmtVolume(stats.weekVolume)}</div>
            <div className="stat-label">Volume</div>
            {stats.volumeChange != null && (
              <div className={`trend-arrow ${stats.volumeChange >= 0 ? 'trend-up' : 'trend-down'}`} style={{ marginTop: 4 }}>
                {stats.volumeChange >= 0 ? '↑' : '↓'} {Math.round(Math.abs(stats.volumeChange))}% vs last wk
              </div>
            )}
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

      {stats.muscles.length > 0 && (
        <div className="card">
          <label className="label">Muscle focus</label>
          {stats.muscles.map((m) => (
            <div className="session-row" key={m.group}>
              <span className="session-date" style={{ minWidth: 0, flex: 1 }}>{m.group}</span>
              <span className="session-best">{m.count}×</span>
            </div>
          ))}
        </div>
      )}

      {last && (
        <div className="card">
          <label className="label">Last session</label>
          <p className="small" style={{ margin: 0 }}>{last.split || 'Workout'} · {last.exercises.length} exercises</p>
        </div>
      )}
    </aside>
  )
}
