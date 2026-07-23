import { useMemo, useState } from 'react'
import { toKg, KG_PER_LB, fmtWeight, fmtVolume, fmtDate } from '../lib/format'
import { pictogramFor, groupFor, GROUP_COLOR } from '../lib/exerciseLibrary'
import { PICTOGRAMS } from '../lib/pictograms'
import { Tally } from './TabBar'

// Build: exercise name -> { sessions: [{date, bestKg, bestSet, volKg}], allLbs }
function buildStats(workouts) {
  const map = new Map()
  const asc = [...workouts].sort((a, b) => a.date.localeCompare(b.date))
  for (const w of asc) {
    for (const ex of w.exercises) {
      let bestKg = null
      let bestSet = null
      let volKg = 0
      let sawKg = false
      let sawLbs = false
      for (const s of ex.sets) {
        if (s.weight == null) continue
        const kg = toKg(Number(s.weight), s.unit)
        if (s.unit === 'lbs') sawLbs = true
        else sawKg = true
        volKg += kg * (s.reps || 0) * (s.per_side ? 2 : 1)
        if (bestKg === null || kg > bestKg) {
          bestKg = kg
          bestSet = s
        }
      }
      if (bestKg === null) continue
      if (!map.has(ex.name)) map.set(ex.name, { sessions: [], sawKg: false, sawLbs: false })
      const entry = map.get(ex.name)
      entry.sessions.push({ date: w.date, bestKg, bestSet, volKg })
      entry.sawKg = entry.sawKg || sawKg
      entry.sawLbs = entry.sawLbs || sawLbs
    }
  }
  return map
}

function Chart({ points, unit }) {
  const W = 320
  const H = 150
  const PX = 26
  const PY = 18
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (i) => (points.length === 1 ? W / 2 : PX + (i * (W - 2 * PX)) / (points.length - 1))
  const y = (v) => H - PY - ((v - min) / span) * (H - 2 * PY)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Best set per session in ${unit}`}>
      <line x1={PX - 8} y1={y(max)} x2={W - PX + 8} y2={y(max)} stroke="var(--line)" strokeDasharray="3 4" />
      <line x1={PX - 8} y1={y(min)} x2={W - PX + 8} y2={y(min)} stroke="var(--line)" strokeDasharray="3 4" />
      <text x={W - PX + 10} y={y(max) + 4} fill="var(--ink-faint)" fontSize="10" textAnchor="start">{fmtWeight(max)}</text>
      <text x={W - PX + 10} y={y(min) + 4} fill="var(--ink-faint)" fontSize="10" textAnchor="start">{fmtWeight(min)}</text>
      {points.length > 1 && (
        <path d={path} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="4" fill="var(--yellow)" stroke="var(--bg-deep)" strokeWidth="1.5" />
      ))}
      <text x={PX - 8} y={H - 2} fill="var(--ink-faint)" fontSize="10" textAnchor="start">{fmtDate(points[0].date)}</text>
      {points.length > 1 && (
        <text x={W - PX + 8} y={H - 2} fill="var(--ink-faint)" fontSize="10" textAnchor="end">{fmtDate(points[points.length - 1].date)}</text>
      )}
    </svg>
  )
}

export default function Progress({ workouts }) {
  const stats = useMemo(() => buildStats(workouts), [workouts])
  const names = useMemo(
    () => [...stats.keys()].sort((a, b) => stats.get(b).sessions.length - stats.get(a).sessions.length || a.localeCompare(b)),
    [stats]
  )
  const [picked, setPicked] = useState('')
  const name = picked && stats.has(picked) ? picked : names[0]

  if (!name) {
    return (
      <div className="empty">
        <Tally size={44} />
        <p>Nothing to chart yet.</p>
        <p className="small">Log a workout with weights and it shows up here.</p>
      </div>
    )
  }

  const entry = stats.get(name)
  // If an exercise was only ever logged in lbs, show its chart in lbs
  const unit = entry.sawLbs && !entry.sawKg ? 'lbs' : 'kg'
  const display = (kg) => (unit === 'lbs' ? kg / KG_PER_LB : kg)

  const sessions = entry.sessions
  const points = sessions.map((s) => ({ date: s.date, value: Number(display(s.bestKg).toFixed(2)) }))
  const first = points[0].value
  const latest = points[points.length - 1].value
  const allTime = Math.max(...points.map((p) => p.value))
  const change = latest - first
  const changeText = `${change > 0 ? '+' : ''}${fmtWeight(change)}`

  const bestLine = (s) => {
    const bs = s.bestSet
    return `${fmtWeight(bs.weight)} ${bs.unit === 'lbs' ? 'lb' : 'kg'} × ${bs.reps ?? '–'}${bs.per_side ? ' /side' : ''}`
  }

  const NamePic = PICTOGRAMS[pictogramFor(name)]
  const nameColor = GROUP_COLOR[groupFor(name)] || GROUP_COLOR.Other

  return (
    <div>
      <div className="ex-picker">
        <label className="label" htmlFor="ex-select">Exercise</label>
        <div className="ex-picker-row">
          {NamePic && (
            <span className="exercise-thumb" style={{ background: nameColor + '26' }}>
              <NamePic width="30" height="30" />
            </span>
          )}
          <select id="ex-select" value={name} onChange={(e) => setPicked(e.target.value)}>
            {names.map((n) => (
              <option key={n} value={n}>{n} ({stats.get(n).sessions.length})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="chart-wrap">
        <Chart points={points} unit={unit} />
        <div className="chart-caption">Best set per session, {unit}</div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-value">{fmtWeight(latest)} {unit === 'lbs' ? 'lb' : 'kg'}</div>
          <div className="stat-label">Latest best</div>
        </div>
        <div className="stat">
          <div className="stat-value">{fmtWeight(allTime)} {unit === 'lbs' ? 'lb' : 'kg'}</div>
          <div className="stat-label">All-time best</div>
        </div>
        <div className="stat">
          <div className="stat-value">{changeText}</div>
          <div className="stat-label">Since first session</div>
        </div>
        <div className="stat">
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">Sessions</div>
        </div>
      </div>

      <div className="card">
        {[...sessions].reverse().map((s, i) => (
          <div className="session-row" key={`${s.date}-${i}`}>
            <span className="session-date">{fmtDate(s.date)}</span>
            <span className="session-best">{bestLine(s)}</span>
            <span className="session-vol">{fmtVolume(s.volKg)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
